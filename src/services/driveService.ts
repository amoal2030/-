/**
 * Google Drive Integration Service — الإقفال | AL EQFAL
 * Decentralized Per-Organization Owner Drive Architecture
 *
 * Security & Compliance Guarantees:
 * - Google Identity Services (GIS) Token Model
 * - Minimum Scopes: openid, email, https://www.googleapis.com/auth/drive.file
 * - Access Token lives strictly in browser RAM (never Firestore, localStorage, or sessionStorage)
 * - Dynamic expires_in calculation with 120s safety margin
 * - Strict Identity Verification: Matches Google UserInfo sub, email, and email_verified === true
 *   against the Firebase Google Provider of the verified organization owner
 * - No Client Secret in browser code
 * - Strict folder verification via files.get (existence, non-trashed, folder mimeType,
 *   exact name, matching appProperties, and real parent folder ID for branch/month folders)
 * - Bounded retry on transient post-create 404 propagation delay; explicit 401/403/404 diagnostics
 * - Halts on conflict or non-matching stored folders without deleting/moving/renaming Drive items
 */

import { Branch, DriveMonthFolderRef, Organization } from '../types';

export interface DriveTokenSession {
  accessToken: string;
  expiresIn: number;
  obtainedAt: number;
  expiresAt: number;
  email: string;
  name: string;
  sub: string;
  verified: boolean;
}

export interface DriveFolderRef {
  folderId: string;
  folderName: string;
  webViewLink: string;
  parents?: string[];
  reused: boolean;
  verifiedViaGet: boolean;
}

export interface BranchDriveProvisionResult {
  branchId: string;
  branchName: string;
  branchFolder: DriveFolderRef;
  monthFolder: DriveMonthFolderRef;
}

export interface OrgDriveProvisionResult {
  orgFolder: DriveFolderRef;
  branchResults: BranchDriveProvisionResult[];
  monthFolderMap: Record<string, DriveMonthFolderRef>;
  verifiedCount: number;
}

// In-Memory token session ONLY for the active browser tab
let activeSession: DriveTokenSession | null = null;

const DRIVE_FOLDER_MIME = 'application/vnd.google-apps.folder';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Builds a Google Drive folder URL targeting the specific linked Google account (authuser)
 * so multi-account browser sessions open the correct owner Drive.
 */
export const buildGoogleDriveFolderUrl = (
  webViewLink: string | undefined,
  folderId: string,
  accountEmail?: string
): string => {
  const fallbackUrl = `https://drive.google.com/drive/folders/${encodeURIComponent(folderId)}`;
  const rawUrl = webViewLink?.trim() || fallbackUrl;
  if (!accountEmail?.trim()) {
    return rawUrl;
  }
  try {
    const parsed = new URL(rawUrl);
    parsed.searchParams.set('authuser', accountEmail.trim());
    return parsed.toString();
  } catch {
    const sep = rawUrl.includes('?') ? '&' : '?';
    return `${rawUrl}${sep}authuser=${encodeURIComponent(accountEmail.trim())}`;
  }
};

/**
 * Resolves the configured Google OAuth Web Client ID strictly from VITE_GOOGLE_DRIVE_CLIENT_ID.
 * Never falls back to AI Studio preview OAuth or invents any Client ID.
 */
export const getDriveOAuthClientConfig = (): {
  clientId: string;
  source: 'vite_env' | 'missing';
} => {
  const envClientId = (import.meta as any).env?.VITE_GOOGLE_DRIVE_CLIENT_ID?.trim();
  if (envClientId) {
    return { clientId: envClientId, source: 'vite_env' };
  }
  return { clientId: '', source: 'missing' };
};

/**
 * Dynamically loads the Google Identity Services script
 */
export const loadGoogleIdentityScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && (window as any).google?.accounts?.oauth2) {
      return resolve();
    }
    const existingScript = document.getElementById('google-gis-script');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', () =>
        reject(new Error('فشل تحميل مكتبة Google Identity Services. يرجى التحقق من الاتصال.'))
      );
      return;
    }
    const script = document.createElement('script');
    script.id = 'google-gis-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error('فشل تحميل مكتبة مصادقة Google Identity Services. يرجى التحقق من اتصال الإنترنت.'));
    document.head.appendChild(script);
  });
};

/**
 * Verifies that an active Drive session strictly matches the organization owner's
 * Firebase Google Provider AND (when already linked) the organization's linked Google account.
 */
export const assertDriveSessionMatchesAccount = (
  session: DriveTokenSession | null,
  expected: {
    googleUid: string;
    email: string;
    linkedSub?: string;
    linkedEmail?: string;
  }
): DriveTokenSession => {
  if (!session || !session.accessToken || !session.verified) {
    clearDriveSession();
    throw new Error('لا توجد جلسة تفويض Google Drive نشطة وموثقة في الذاكرة.');
  }
  if (Date.now() >= session.expiresAt) {
    clearDriveSession();
    throw new Error('انتهت صلاحية جلسة تفويض Google Drive المؤقتة (401). يرجى إعادة التفويض.');
  }
  if (!expected.googleUid || !expected.email) {
    throw new Error('بيانات مزود Google لحساب مالك المؤسسة غير مكتملة.');
  }
  if (session.sub !== expected.googleUid) {
    clearDriveSession();
    throw new Error(
      `حساب Google النشط (${session.email}) لا يطابق هوية Google المسجلة للمالك في Firebase. تم إيقاف المزامنة وإسقاط الجلسة.`
    );
  }
  if (session.email.toLowerCase().trim() !== expected.email.toLowerCase().trim()) {
    clearDriveSession();
    throw new Error(
      `البريد الإلكتروني للجلسة النشطة (${session.email}) لا يطابق بريد مالك المؤسسة (${expected.email}). تم إيقاف المزامنة.`
    );
  }
  if (expected.linkedSub && session.sub !== expected.linkedSub) {
    clearDriveSession();
    throw new Error(
      `الحساب المفوض حالياً (${session.email}) يختلف عن حساب Google المرتبط مسبقاً بالمؤسسة (${expected.linkedEmail || expected.linkedSub}). تم إيقاف العملية دون تعديل المجلدات.`
    );
  }
  if (
    expected.linkedEmail &&
    session.email.toLowerCase().trim() !== expected.linkedEmail.toLowerCase().trim()
  ) {
    clearDriveSession();
    throw new Error(
      `بريد جلسة Google Drive الحالية (${session.email}) يختلف عن البريد المرتبط بالمؤسسة (${expected.linkedEmail}). تم إيقاف العملية لحماية المجلدات.`
    );
  }
  return session;
};

/**
 * Requests OAuth access token via GIS and strictly validates Google identity
 * against the organization owner's Firebase Google Provider (and optional linked org account).
 */
export const requestDriveAuthorization = async (
  expectedGoogleUid: string,
  expectedEmail: string,
  linkedAccount?: { linkedSub?: string; linkedEmail?: string }
): Promise<DriveTokenSession> => {
  if (!expectedGoogleUid || !expectedEmail) {
    throw new Error('بيانات مزود Google لحساب المالك غير مكتملة في الجلسة الحالية.');
  }

  if (linkedAccount?.linkedSub && linkedAccount.linkedSub !== expectedGoogleUid) {
    throw new Error(
      `حساب Google المسجل دخولاً به (${expectedEmail}) لا يطابق الحساب المرتبط بالمؤسسة (${linkedAccount.linkedEmail || linkedAccount.linkedSub}). يرجى الدخول بحساب المالك المرتبط أو فصل الربط أولاً.`
    );
  }

  await loadGoogleIdentityScript();

  const { clientId } = getDriveOAuthClientConfig();
  if (!clientId) {
    throw new Error(
      'متغير البيئة VITE_GOOGLE_DRIVE_CLIENT_ID غير متاح في بيئة التشغيل الحالية. يرجى ضبطه بمعرّف OAuth 2.0 Web Client ID المخصص للنطاق المنشور.'
    );
  }

  return new Promise((resolve, reject) => {
    try {
      const oauth2 = (window as any).google?.accounts?.oauth2;
      if (!oauth2?.initTokenClient) {
        return reject(new Error('واجهة Google Identity Services غير جاهزة في المتصفح الحالي.'));
      }

      const client = oauth2.initTokenClient({
        client_id: clientId,
        scope: 'openid email https://www.googleapis.com/auth/drive.file',
        login_hint: linkedAccount?.linkedEmail || expectedEmail,
        callback: async (tokenResponse: any) => {
          if (tokenResponse?.error) {
            activeSession = null;
            const desc = tokenResponse.error_description || tokenResponse.error;
            if (tokenResponse.error === 'access_denied') {
              return reject(new Error('تم إلغاء التفويض أو رفض منح الصلاحية من نافذة Google.'));
            }
            return reject(new Error(`خطأ تفويض Google OAuth: ${desc}`));
          }

          if (!tokenResponse?.access_token) {
            activeSession = null;
            return reject(new Error('لم يُرجع خادم Google رمز وصول (Access Token) صالحاً.'));
          }

          const rawExpiresIn = Number(tokenResponse.expires_in);
          if (isNaN(rawExpiresIn) || rawExpiresIn <= 0) {
            activeSession = null;
            return reject(new Error('لم ترجع استجابة Google مدة صلاحية صالحة (expires_in).'));
          }

          const obtainedAt = Date.now();
          const safetyMarginMs = Math.min(120 * 1000, Math.floor((rawExpiresIn * 1000) / 4));
          const expiresAt = obtainedAt + rawExpiresIn * 1000 - safetyMarginMs;
          const token: string = tokenResponse.access_token;

          try {
            const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${token}` },
            });

            if (!userInfoRes.ok) {
              activeSession = null;
              return reject(
                new Error(
                  `تعذر التحقق من هوية حساب Google عبر نقطة UserInfo (رمز: ${userInfoRes.status}). تم إسقاط الرمز من الذاكرة.`
                )
              );
            }

            const userInfo = await userInfoRes.json();

            if (userInfo.email_verified !== true) {
              activeSession = null;
              return reject(new Error('بريد حساب Google غير موثق (email_verified !== true). تم رفض الربط.'));
            }

            if (!userInfo.sub || userInfo.sub !== expectedGoogleUid) {
              activeSession = null;
              return reject(
                new Error(
                  `الحساب المختار (${userInfo.email || 'غير معروف'}) لا يطابق هوية Google المسجلة لمالك المؤسسة. تم رفض الربط والتخلص من رمز الوصول من الذاكرة دون استدعاء revoke.`
                )
              );
            }

            if (
              !userInfo.email ||
              userInfo.email.toLowerCase().trim() !== expectedEmail.toLowerCase().trim()
            ) {
              activeSession = null;
              return reject(
                new Error(
                  `البريد الإلكتروني للحساب المختار (${userInfo.email || 'غير معروف'}) لا يطابق بريد مالك المؤسسة المعتمد (${expectedEmail}). تم رفض الربط.`
                )
              );
            }

            if (linkedAccount?.linkedSub && userInfo.sub !== linkedAccount.linkedSub) {
              activeSession = null;
              return reject(
                new Error(
                  `الحساب المختار (${userInfo.email}) لا يطابق حساب Google المرتبط بالمؤسسة (${linkedAccount.linkedEmail || linkedAccount.linkedSub}). تم رفض العملية.`
                )
              );
            }

            const session: DriveTokenSession = {
              accessToken: token,
              expiresIn: rawExpiresIn,
              obtainedAt,
              expiresAt,
              email: userInfo.email,
              name: userInfo.name || expectedEmail,
              sub: userInfo.sub,
              verified: true,
            };

            activeSession = session;
            resolve(session);
          } catch (verifyErr: any) {
            activeSession = null;
            reject(new Error(`فشل التحقق من هوية Google: ${verifyErr?.message || verifyErr}`));
          }
        },
        error_callback: (err: any) => {
          activeSession = null;
          const errType = err?.type || 'oauth_error';
          if (errType === 'popup_closed') {
            reject(new Error('تم إغلاق نافذة تفويض Google قبل إتمام العملية.'));
          } else if (errType === 'popup_failed_to_open') {
            reject(new Error('حظر المتصفح فتح نافذة تفويض Google المنبثقة. يرجى السماح بالنوافذ المنبثقة للموقع.'));
          } else {
            reject(
              new Error(`تعذر إتمام تفويض Google (${errType}). تأكد من إضافة النطاق في Authorized JavaScript origins.`)
            );
          }
        },
      });

      client.requestAccessToken({ prompt: 'select_account' });
    } catch (err: any) {
      activeSession = null;
      reject(new Error(`فشل تهيئة عميل Google OAuth: ${err?.message || err}`));
    }
  });
};

/**
 * Returns active session if valid and unexpired; otherwise clears memory
 */
export const getActiveDriveSession = (): DriveTokenSession | null => {
  if (!activeSession) return null;
  if (Date.now() >= activeSession.expiresAt) {
    activeSession = null;
    return null;
  }
  return activeSession;
};

/**
 * Clears in-memory Drive session completely
 */
export const clearDriveSession = (): void => {
  activeSession = null;
};

/**
 * Escapes single quotes and backslashes for Google Drive v3 search query syntax
 */
function escapeDriveQueryValue(val: string): string {
  return val.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/**
 * Formats clear Arabic Drive API errors specifying folder role, folder name, HTTP status, and root cause.
 */
function formatDriveHttpError(params: {
  status: number;
  apiMessage?: string;
  folderRoleLabel: string;
  folderName: string;
  operation: 'search' | 'get' | 'create';
  folderId?: string;
  parentId?: string;
}): Error {
  const { status, apiMessage, folderRoleLabel, folderName, operation, folderId, parentId } = params;
  const opLabel =
    operation === 'search'
      ? 'البحث عن'
      : operation === 'get'
      ? 'التحقق من'
      : 'إنشاء';
  const targetDesc = `${folderRoleLabel} "${folderName}"`;
  const idHint = folderId ? ` (المعرّف: ${folderId})` : '';
  const detailSuffix = apiMessage ? ` — تفاصيل Google API: ${apiMessage}` : '';

  if (status === 401) {
    clearDriveSession();
    return new Error(
      `[401] انتهت صلاحية رمز تفويض Google Drive أو رُفض أثناء ${opLabel} ${targetDesc}. يرجى إعادة التفويض.${detailSuffix}`
    );
  }
  if (status === 403) {
    return new Error(
      `[403] تم رفض الصلاحية أثناء ${opLabel} ${targetDesc}${idHint}. تأكد من تفعيل Google Drive API ومنح نطاق drive.file لنفس معرّف العميل ولنفس حساب المالك.${detailSuffix}`
    );
  }
  if (status === 404) {
    const parentHint = parentId ? ` (المجلد الأب: ${parentId})` : '';
    return new Error(
      `[404] تعذر العثور على ${targetDesc}${idHint}${parentHint} في Google Drive أو يتعذر الوصول إليه بصلاحية drive.file الحالية.${detailSuffix}`
    );
  }
  return new Error(
    `[${status}] فشل ${opLabel} ${targetDesc}${idHint}.${detailSuffix}`
  );
}

/**
 * Checks whether actual Drive appProperties contain every required key/value pair.
 */
function findAppPropertiesMismatch(
  actual: Record<string, any> | undefined,
  expected: Record<string, string>
): string | null {
  if (!actual || typeof actual !== 'object') {
    return 'خصائص التطبيق (appProperties) مفقودة في بيانات المجلد';
  }
  for (const [key, expectedValue] of Object.entries(expected)) {
    const actualValue = actual[key];
    if (actualValue !== expectedValue) {
      return `تعارض الخاصية (${key}): المتوقع "${expectedValue}" والفعلي "${actualValue ?? 'غير موجود'}"`;
    }
  }
  return null;
}

/**
 * Strictly verifies a folder in Google Drive via files.get:
 * - Exists in Drive (supports bounded retry ONLY on transient post-create 404)
 * - Not trashed
 * - mimeType === application/vnd.google-apps.folder
 * - Exact name match
 * - Exact appProperties match (systemId, role, orgId, and branchId/yearMonth when specified)
 * - When expectedParentId is provided (branch/month folders), parents MUST include expectedParentId.
 * - When expectedParentId is omitted (organization folder in My Drive), does NOT treat mere presence
 *   of parents as proof of root placement.
 */
async function verifyFolderViaGet(params: {
  token: string;
  folderId: string;
  expectedName: string;
  expectedParentId?: string;
  expectedAppProperties: Record<string, string>;
  folderRoleLabel: string;
  retryDelaysMsOn404?: number[];
}): Promise<DriveFolderRef> {
  const {
    token,
    folderId,
    expectedName,
    expectedParentId,
    expectedAppProperties,
    folderRoleLabel,
    retryDelaysMsOn404 = [],
  } = params;

  const maxAttempts = 1 + retryDelaysMsOn404.length;
  let last404Message: string | undefined;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      await sleep(retryDelaysMsOn404[attempt - 1]);
    }

    let res: Response;
    try {
      res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
          folderId
        )}?fields=id,name,mimeType,webViewLink,trashed,parents,appProperties`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
    } catch (networkErr: any) {
      throw new Error(
        `فشل الاتصال أثناء التحقق عبر files.get من ${folderRoleLabel} "${expectedName}" (${folderId}): ${
          networkErr?.message || networkErr
        }`
      );
    }

    if (res.status === 404) {
      const errJson = await res.json().catch(() => ({}));
      last404Message = errJson?.error?.message;
      if (attempt < maxAttempts - 1) {
        continue;
      }
      throw formatDriveHttpError({
        status: 404,
        apiMessage: last404Message,
        folderRoleLabel,
        folderName: expectedName,
        operation: 'get',
        folderId,
        parentId: expectedParentId,
      });
    }

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw formatDriveHttpError({
        status: res.status,
        apiMessage: errJson?.error?.message,
        folderRoleLabel,
        folderName: expectedName,
        operation: 'get',
        folderId,
        parentId: expectedParentId,
      });
    }

    const data = await res.json();

    if (!data?.id || data.id !== folderId) {
      throw new Error(
        `تعارض في التحقق من ${folderRoleLabel} "${expectedName}": المعرّف العائد (${data?.id || 'فارغ'}) لا يطابق (${folderId}).`
      );
    }

    if (data.trashed === true) {
      throw new Error(
        `المجلد المرتبط لـ ${folderRoleLabel} "${expectedName}" (المعرّف: ${folderId}) موجود حالياً في سلة مهملات Google Drive. يرجى استعادته أو فصل الربط وإعادة الربط دون إنشاء نسخ مكررة.`
      );
    }

    if (data.mimeType !== DRIVE_FOLDER_MIME) {
      throw new Error(
        `العنصر المرتبط لـ ${folderRoleLabel} "${expectedName}" (المعرّف: ${folderId}) ليس مجلداً (mimeType: ${data.mimeType || 'غير معروف'}). تم إيقاف العملية.`
      );
    }

    if (data.name !== expectedName) {
      throw new Error(
        `تعارض اسم ${folderRoleLabel}: الاسم المتوقع "${expectedName}" بينما الاسم الفعلي في Google Drive هو "${data.name || ''}" (المعرّف: ${folderId}). تم إيقاف العملية دون تعديل تلقائي.`
      );
    }

    const appPropsError = findAppPropertiesMismatch(data.appProperties, expectedAppProperties);
    if (appPropsError) {
      throw new Error(
        `المجلد المرتبط لـ ${folderRoleLabel} "${expectedName}" (المعرّف: ${folderId}) لا يطابق هوية النظام أو المؤسسة: ${appPropsError}. تم إيقاف العملية دون تعديل Firestore أو إنشاء نسخة بديلة.`
      );
    }

    const actualParentsList: string[] = Array.isArray(data.parents) ? data.parents : [];

    if (expectedParentId) {
      if (!actualParentsList.includes(expectedParentId)) {
        const actualParents = actualParentsList.length > 0 ? actualParentsList.join(', ') : 'لا يوجد أب';
        throw new Error(
          `تعارض المجلد الأب لـ ${folderRoleLabel} "${expectedName}" (المعرّف: ${folderId}): المتوقع داخل (${expectedParentId}) لكن الفعلي (${actualParents}). تم إيقاف العملية دون نقل تلقائي.`
        );
      }
    }

    return {
      folderId: data.id,
      folderName: data.name,
      webViewLink: data.webViewLink || `https://drive.google.com/drive/folders/${data.id}`,
      parents: actualParentsList,
      reused: true,
      verifiedViaGet: true,
    };
  }

  throw formatDriveHttpError({
    status: 404,
    apiMessage: last404Message,
    folderRoleLabel,
    folderName: expectedName,
    operation: 'get',
    folderId,
    parentId: expectedParentId,
  });
}

/**
 * Searches all pages in My Drive for folders matching:
 * - exact folder name
 * - mimeType === application/vnd.google-apps.folder
 * - trashed = false
 * - appProperties (systemId, role, orgId, and branchId/yearMonth when specified)
 * - concrete parentId in parents ONLY when parentId is provided (branch/month folders)
 * Never uses 'root' in parents.
 */
async function listMatchingDriveFolders(params: {
  token: string;
  folderName: string;
  parentId?: string;
  expectedAppProperties: Record<string, string>;
  folderRoleLabel: string;
}): Promise<any[]> {
  const { token, folderName, parentId, expectedAppProperties, folderRoleLabel } = params;
  const escapedName = escapeDriveQueryValue(folderName);
  const queryParts: string[] = [
    `name = '${escapedName}'`,
    `mimeType = '${DRIVE_FOLDER_MIME}'`,
    `trashed = false`,
  ];

  for (const [key, value] of Object.entries(expectedAppProperties)) {
    queryParts.push(
      `appProperties has { key='${escapeDriveQueryValue(key)}' and value='${escapeDriveQueryValue(value)}' }`
    );
  }

  if (parentId) {
    queryParts.push(`'${escapeDriveQueryValue(parentId)}' in parents`);
  }

  const queryFilter = queryParts.join(' and ');

  let rawFolders: any[] = [];
  let pageToken: string | undefined = undefined;

  do {
    const url = new URL('https://www.googleapis.com/drive/v3/files');
    url.searchParams.set('q', queryFilter);
    url.searchParams.set(
      'fields',
      'nextPageToken, files(id, name, mimeType, appProperties, webViewLink, trashed, parents)'
    );
    url.searchParams.set('spaces', 'drive');
    url.searchParams.set('includeItemsFromAllDrives', 'false');
    url.searchParams.set('supportsAllDrives', 'false');
    url.searchParams.set('pageSize', '50');
    if (pageToken) {
      url.searchParams.set('pageToken', pageToken);
    }

    let res: Response;
    try {
      res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (networkErr: any) {
      throw new Error(
        `فشل الاتصال أثناء البحث عن ${folderRoleLabel} "${folderName}": ${networkErr?.message || networkErr}`
      );
    }

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw formatDriveHttpError({
        status: res.status,
        apiMessage: errJson?.error?.message,
        folderRoleLabel,
        folderName,
        operation: 'search',
        parentId,
      });
    }

    const data = await res.json();
    if (Array.isArray(data.files)) {
      rawFolders = rawFolders.concat(data.files);
    }
    pageToken = data.nextPageToken;
  } while (pageToken);

  return rawFolders.filter((file) => {
    if (!file || typeof file.id !== 'string') return false;
    if (file.trashed === true) return false;
    if (file.mimeType !== DRIVE_FOLDER_MIME) return false;
    if (file.name !== folderName) return false;
    if (findAppPropertiesMismatch(file.appProperties, expectedAppProperties) !== null) return false;
    if (parentId && (!Array.isArray(file.parents) || !file.parents.includes(parentId))) return false;
    return true;
  });
}

/**
 * Idempotently locates or creates a folder in Google Drive (compatible with drive.file scope):
 * 1. If existingFolderId is stored in Firestore, strictly verifies it via files.get (name, mimeType,
 *    trashed=false, appProperties, and parentId when concrete) without deleting/replacing Firestore.
 * 2. Searches all pages (nextPageToken) via files.list matching name, mimeType, trashed=false, appProperties,
 *    and parentId (for branch/month folders only — never 'root' in parents).
 * 3. Halts cleanly on >1 match without deleting, moving, renaming, or creating duplicates.
 * 4. Verifies single match strictly via files.get before reusing.
 * 5. On 0 matches, calls files.create (omitting parents completely for org folder; sending parents: [parentId]
 *    for branch/month folders), validates created payload, then verifies via files.get (bounded 404 retry).
 */
export async function ensureDriveFolder(params: {
  token: string;
  folderName: string;
  folderRoleLabel?: string;
  parentId?: string;
  appProperties: Record<string, string>;
  existingFolderId?: string;
}): Promise<DriveFolderRef> {
  const {
    token,
    folderName,
    folderRoleLabel = 'المجلد',
    parentId,
    appProperties,
    existingFolderId,
  } = params;

  // 1. If a folderId is already recorded in Firestore, verify it strictly via files.get
  if (existingFolderId) {
    const verifiedExisting = await verifyFolderViaGet({
      token,
      folderId: existingFolderId,
      expectedName: folderName,
      expectedParentId: parentId,
      expectedAppProperties: appProperties,
      folderRoleLabel,
    });

    const matchingStored = await listMatchingDriveFolders({
      token,
      folderName,
      parentId,
      expectedAppProperties: appProperties,
      folderRoleLabel,
    });

    if (matchingStored.length > 1) {
      const idsList = matchingStored.map((f) => f.id).join(' , ');
      throw new Error(
        `تم العثور على (${matchingStored.length}) مجلدات متطابقة لـ ${folderRoleLabel} "${folderName}" في Drive (المعرفات: ${idsList}). تم إيقاف العملية لمنع التكرار والتضارب.`
      );
    }

    if (matchingStored.length === 1 && matchingStored[0].id !== existingFolderId) {
      throw new Error(
        `تعارض في المعرّف المسجل لـ ${folderRoleLabel} "${folderName}": المعرّف المخزن (${existingFolderId}) يختلف عن المجلد المطابق في Drive (${matchingStored[0].id}). تم إيقاف العملية دون تعديل تلقائي.`
      );
    }

    return verifiedExisting;
  }

  // 2. Search across all pages in My Drive using name, mimeType, trashed=false, appProperties (and parentId if concrete)
  const matchingFolders = await listMatchingDriveFolders({
    token,
    folderName,
    parentId,
    expectedAppProperties: appProperties,
    folderRoleLabel,
  });

  // 3. Multiple matches -> halt cleanly without creating duplicates or guessing
  if (matchingFolders.length > 1) {
    const idsList = matchingFolders.map((f) => f.id).join(' , ');
    throw new Error(
      `تم العثور على (${matchingFolders.length}) مجلدات متطابقة لـ ${folderRoleLabel} "${folderName}" في Drive (المعرفات: ${idsList}). تم إيقاف العملية لمنع التكرار والتضارب؛ يرجى مراجعة المجلدات في Google Drive أولاً.`
    );
  }

  // 4. Single match -> verify strictly via files.get before reusing
  if (matchingFolders.length === 1) {
    const found = matchingFolders[0];
    return verifyFolderViaGet({
      token,
      folderId: found.id,
      expectedName: folderName,
      expectedParentId: parentId,
      expectedAppProperties: appProperties,
      folderRoleLabel,
    });
  }

  // 5. Zero matches -> create folder via files.create (omit parents completely for root-level org folder)
  const createPayload: {
    name: string;
    mimeType: string;
    appProperties: Record<string, string>;
    parents?: string[];
  } = {
    name: folderName,
    mimeType: DRIVE_FOLDER_MIME,
    appProperties,
  };

  if (parentId) {
    createPayload.parents = [parentId];
  }

  let createRes: Response;
  try {
    createRes = await fetch(
      'https://www.googleapis.com/drive/v3/files?fields=id,name,mimeType,webViewLink,parents,trashed,appProperties',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createPayload),
      }
    );
  } catch (networkErr: any) {
    throw new Error(
      `فشل الاتصال أثناء إنشاء ${folderRoleLabel} "${folderName}": ${networkErr?.message || networkErr}`
    );
  }

  if (!createRes.ok) {
    const errJson = await createRes.json().catch(() => ({}));
    throw formatDriveHttpError({
      status: createRes.status,
      apiMessage: errJson?.error?.message,
      folderRoleLabel,
      folderName,
      operation: 'create',
      parentId,
    });
  }

  const created = await createRes.json();

  if (!created?.id || typeof created.id !== 'string') {
    throw new Error(
      `استجابة files.create لـ ${folderRoleLabel} "${folderName}" لم تُرجع معرّف مجلد (id) صالحاً.`
    );
  }
  if (created.mimeType && created.mimeType !== DRIVE_FOLDER_MIME) {
    throw new Error(
      `استجابة files.create لـ ${folderRoleLabel} "${folderName}" أرجعت نوعاً غير صالح (${created.mimeType}).`
    );
  }
  if (created.name && created.name !== folderName) {
    throw new Error(
      `استجابة files.create لـ ${folderRoleLabel} أرجعت اسماً غير مطابق (${created.name}) بدلاً من "${folderName}".`
    );
  }
  if (created.appProperties) {
    const createdPropsMismatch = findAppPropertiesMismatch(created.appProperties, appProperties);
    if (createdPropsMismatch) {
      throw new Error(
        `استجابة files.create لـ ${folderRoleLabel} "${folderName}" أرجعت appProperties غير مطابقة: ${createdPropsMismatch}.`
      );
    }
  }
  if (parentId && Array.isArray(created.parents) && !created.parents.includes(parentId)) {
    throw new Error(
      `استجابة files.create لـ ${folderRoleLabel} "${folderName}" أرجعت أباً غير مطابق (${created.parents.join(', ')}) بدلاً من (${parentId}).`
    );
  }

  // 6. Mandatory post-create files.get verification (with bounded 404 retry for Drive indexing latency)
  const postVerified = await verifyFolderViaGet({
    token,
    folderId: created.id,
    expectedName: folderName,
    expectedParentId: parentId,
    expectedAppProperties: appProperties,
    folderRoleLabel,
    retryDelaysMsOn404: [500, 1000],
  });

  return {
    ...postVerified,
    reused: false,
  };
}

/**
 * Provisions and strictly verifies the full organization hierarchy in the owner's Google Drive:
 *   My Drive (created without parents field; matched via name, mimeType, trashed=false, and appProperties)
 *     └── AL EQFAL - [Organization Name] - [OrgID]
 *           └── [Branch Name] - [Branch Code]
 *                 └── [YYYY-MM]
 */
export async function provisionOrganizationDriveHierarchy(params: {
  token: string;
  org: Organization;
  branches: Branch[];
  yearMonth?: string;
}): Promise<OrgDriveProvisionResult> {
  const { token, org, branches } = params;
  const targetYearMonth = params.yearMonth || new Date().toISOString().slice(0, 7);

  if (!/^\d{4}-\d{2}$/.test(targetYearMonth)) {
    throw new Error('صيغة الشهر غير صحيحة. يجب أن تكون بصيغة YYYY-MM (مثل 2026-11).');
  }

  // 1. Organization Folder (placed in My Drive automatically by omitting parents; never uses 'root')
  const orgFolderName = `AL EQFAL - ${org.name.trim()} - ${org.id}`;
  const orgFolder = await ensureDriveFolder({
    token,
    folderName: orgFolderName,
    folderRoleLabel: 'مجلد المؤسسة',
    existingFolderId: org.driveFolderId || undefined,
    appProperties: {
      systemId: 'al_eqfal',
      role: 'org_root',
      orgId: org.id,
    },
  });

  // 2. Branch Folders & Target Month Folders (strict concrete parentId checks)
  const branchResults: BranchDriveProvisionResult[] = [];
  const monthFolderMap: Record<string, DriveMonthFolderRef> = {
    ...(org.driveMonthFolderIds || {}),
  };

  for (const branch of branches) {
    const branchFolderName = `${branch.name.trim()} - ${branch.code.trim()}`;
    const branchFolder = await ensureDriveFolder({
      token,
      folderName: branchFolderName,
      folderRoleLabel: `مجلد الفرع (${branch.name.trim()})`,
      parentId: orgFolder.folderId,
      existingFolderId: branch.driveFolderId || undefined,
      appProperties: {
        systemId: 'al_eqfal',
        role: 'branch_folder',
        orgId: org.id,
        branchId: branch.id,
      },
    });

    const monthKey = `${branch.id}_${targetYearMonth}`;
    const existingMonthRef = monthFolderMap[monthKey];
    const monthFolderRef = await ensureDriveFolder({
      token,
      folderName: targetYearMonth,
      folderRoleLabel: `مجلد الشهر (${targetYearMonth}) للفرع (${branch.name.trim()})`,
      parentId: branchFolder.folderId,
      existingFolderId: existingMonthRef?.folderId || undefined,
      appProperties: {
        systemId: 'al_eqfal',
        role: 'month_folder',
        orgId: org.id,
        branchId: branch.id,
        yearMonth: targetYearMonth,
      },
    });

    const monthEntry: DriveMonthFolderRef = {
      folderId: monthFolderRef.folderId,
      folderName: monthFolderRef.folderName,
      webViewLink: monthFolderRef.webViewLink,
      branchId: branch.id,
      yearMonth: targetYearMonth,
      updatedAt: new Date().toISOString(),
    };

    monthFolderMap[monthKey] = monthEntry;

    branchResults.push({
      branchId: branch.id,
      branchName: branch.name,
      branchFolder,
      monthFolder: monthEntry,
    });
  }

  // Final strict completeness check before returning
  if (!orgFolder.folderId || !orgFolder.verifiedViaGet) {
    throw new Error(`تعذر إتمام التحقق الفعلي من مجلد المؤسسة "${orgFolderName}".`);
  }
  if (branchResults.length !== branches.length) {
    throw new Error(
      `عدم اكتمال مزامنة الفروع: تم التحقق من (${branchResults.length}) من أصل (${branches.length}) فرع.`
    );
  }
  for (const br of branchResults) {
    if (!br.branchFolder.folderId || !br.branchFolder.verifiedViaGet) {
      throw new Error(`تعذر التحقق الفعلي من مجلد الفرع "${br.branchName}".`);
    }
    if (!br.monthFolder.folderId) {
      throw new Error(`تعذر التحقق الفعلي من مجلد الشهر "${targetYearMonth}" للفرع "${br.branchName}".`);
    }
  }

  return {
    orgFolder,
    branchResults,
    monthFolderMap,
    verifiedCount: 1 + branchResults.length * 2,
  };
}

/**
 * Ensures a specific month folder (YYYY-MM) exists under a specific branch folder on demand
 */
export async function ensureBranchMonthDriveFolder(params: {
  token: string;
  org: Organization;
  branch: Branch;
  yearMonth: string;
}): Promise<{
  orgFolder: DriveFolderRef;
  branchFolder: DriveFolderRef;
  monthFolder: DriveMonthFolderRef;
}> {
  const { token, org, branch, yearMonth } = params;
  if (!/^\d{4}-\d{2}$/.test(yearMonth)) {
    throw new Error('صيغة الشهر غير صحيحة. يجب أن تكون بصيغة YYYY-MM (مثل 2026-11).');
  }

  const orgFolderName = `AL EQFAL - ${org.name.trim()} - ${org.id}`;
  const orgFolder = await ensureDriveFolder({
    token,
    folderName: orgFolderName,
    folderRoleLabel: 'مجلد المؤسسة',
    existingFolderId: org.driveFolderId || undefined,
    appProperties: {
      systemId: 'al_eqfal',
      role: 'org_root',
      orgId: org.id,
    },
  });

  const branchFolderName = `${branch.name.trim()} - ${branch.code.trim()}`;
  const branchFolder = await ensureDriveFolder({
    token,
    folderName: branchFolderName,
    folderRoleLabel: `مجلد الفرع (${branch.name.trim()})`,
    parentId: orgFolder.folderId,
    existingFolderId: branch.driveFolderId || undefined,
    appProperties: {
      systemId: 'al_eqfal',
      role: 'branch_folder',
      orgId: org.id,
      branchId: branch.id,
    },
  });

  const monthKey = `${branch.id}_${yearMonth}`;
  const existingMonthRef = org.driveMonthFolderIds?.[monthKey];
  const createdMonth = await ensureDriveFolder({
    token,
    folderName: yearMonth,
    folderRoleLabel: `مجلد الشهر (${yearMonth}) للفرع (${branch.name.trim()})`,
    parentId: branchFolder.folderId,
    existingFolderId: existingMonthRef?.folderId || undefined,
    appProperties: {
      systemId: 'al_eqfal',
      role: 'month_folder',
      orgId: org.id,
      branchId: branch.id,
      yearMonth,
    },
  });

  return {
    orgFolder,
    branchFolder,
    monthFolder: {
      folderId: createdMonth.folderId,
      folderName: createdMonth.folderName,
      webViewLink: createdMonth.webViewLink,
      branchId: branch.id,
      yearMonth,
      updatedAt: new Date().toISOString(),
    },
  };
}

export const DRIVE_NOT_READY_MESSAGE =
  'يجب على مدير المؤسسة ربط Google Drive والتحقق من جاهزيته قبل استخدام النظام.';

export interface OrgDriveReadinessResult {
  isReady: boolean;
  reasonCode:
    | 'ready'
    | 'not_connected'
    | 'missing_org_folder'
    | 'health_failed'
    | 'write_not_verified'
    | 'missing_branch_folder';
  message: string;
  detail?: string;
}

/**
 * Single source of truth evaluating whether an organization (and optional target branch)
 * has a linked Google Drive verified for actual write and read-back operations.
 */
export function evaluateOrgDriveReadiness(
  org: Organization | null | undefined,
  branch?: Branch | null
): OrgDriveReadinessResult {
  if (!org || org.driveConnected !== true) {
    return {
      isReady: false,
      reasonCode: 'not_connected',
      message: DRIVE_NOT_READY_MESSAGE,
      detail: 'لم يتم ربط Google Drive للمؤسسة حتى الآن.',
    };
  }

  if (!org.driveFolderId || !org.driveFolderId.trim()) {
    return {
      isReady: false,
      reasonCode: 'missing_org_folder',
      message: DRIVE_NOT_READY_MESSAGE,
      detail: 'معرّف مجلد المؤسسة في Google Drive مفقود.',
    };
  }

  if (org.driveLastHealthStatus === 'failed') {
    return {
      isReady: false,
      reasonCode: 'health_failed',
      message: DRIVE_NOT_READY_MESSAGE,
      detail: org.driveHealthError || 'فشل آخر اختبار جاهزية للكتابة والقراءة في Google Drive.',
    };
  }

  if (org.driveWriteVerified !== true) {
    return {
      isReady: false,
      reasonCode: 'write_not_verified',
      message: DRIVE_NOT_READY_MESSAGE,
      detail: 'مجلدات Google Drive مرتبطة ولكن لم يُتحقق بعد من صلاحية الكتابة والقراءة الفعلية.',
    };
  }

  if (branch && (!branch.driveFolderId || !branch.driveFolderId.trim())) {
    return {
      isReady: false,
      reasonCode: 'missing_branch_folder',
      message: DRIVE_NOT_READY_MESSAGE,
      detail: `مجلد الفرع (${branch.name}) غير مزامن في Google Drive بعد. يرجى تنفيذ مزامنة المجلدات من إعدادات المدير.`,
    };
  }

  return {
    isReady: true,
    reasonCode: 'ready',
    message: 'Google Drive مرتبط وجاهز للكتابة والقراءة.',
  };
}

export interface DriveWriteReadTestResult {
  verified: true;
  verifiedAt: string;
  testFileId: string;
  testFileName: string;
  cleanedUp: boolean;
  cleanupMessage: string;
}

/**
 * Performs a real end-to-end write, metadata read-back (files.get), content read-back
 * (files.get?alt=media), and best-effort cleanup (files.delete) inside the organization's
 * Drive folder using strictly the existing drive.file OAuth scope.
 * Never persists any token. Throws clear Arabic errors on 401/403/404 or mismatch.
 */
export async function verifyDriveWriteReadCapability(params: {
  token: string;
  org: Organization;
  orgFolderId: string;
}): Promise<DriveWriteReadTestResult> {
  const { token, org, orgFolderId } = params;

  if (!token || !token.trim()) {
    throw new Error('رمز تفويض Google Drive غير متاح لتنفيذ اختبار الكتابة والقراءة.');
  }
  if (!orgFolderId || !orgFolderId.trim()) {
    throw new Error('معرّف مجلد المؤسسة غير متاح لتنفيذ اختبار الكتابة والقراءة في Google Drive.');
  }

  const checkedAt = new Date().toISOString();
  const nonce = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  const testFileName = `.al_eqfal_health_check_${org.id}_${nonce}.json`;

  const expectedAppProperties: Record<string, string> = {
    systemId: 'al_eqfal',
    role: 'health_check',
    orgId: org.id,
    nonce,
  };

  const payloadObject = {
    systemId: 'al_eqfal',
    purpose: 'drive_write_read_health_check',
    orgId: org.id,
    orgFolderId,
    nonce,
    checkedAt,
  };
  const payloadText = JSON.stringify(payloadObject);

  const metadata = {
    name: testFileName,
    mimeType: 'application/json',
    parents: [orgFolderId],
    appProperties: expectedAppProperties,
  };

  const boundary = `al_eqfal_boundary_${nonce}`;
  const multipartBody =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${payloadText}\r\n` +
    `--${boundary}--`;

  let createdFileId: string | null = null;

  const bestEffortDelete = async (fileId: string): Promise<{ deleted: boolean; note: string }> => {
    try {
      const delRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (delRes.ok || delRes.status === 204 || delRes.status === 404) {
        return { deleted: true, note: 'تم التحقق وحذف ملف الاختبار المؤقت بنجاح.' };
      }
      return {
        deleted: false,
        note: `تم التحقق بنجاح والاحتفاظ بملف التحقق (${testFileName}) لعدم إمكانية حذفه (رمز: ${delRes.status}).`,
      };
    } catch {
      return {
        deleted: false,
        note: `تم التحقق بنجاح والاحتفاظ بملف التحقق (${testFileName}).`,
      };
    }
  };

  try {
    // 1. Write test file via multipart upload
    let createRes: Response;
    try {
      createRes = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,parents,appProperties,size,trashed',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': `multipart/related; boundary=${boundary}`,
          },
          body: multipartBody,
        }
      );
    } catch (networkErr: any) {
      throw new Error(
        `فشل الاتصال أثناء اختبار الكتابة في Google Drive: ${networkErr?.message || networkErr}`
      );
    }

    if (!createRes.ok) {
      const errJson = await createRes.json().catch(() => ({}));
      throw formatDriveHttpError({
        status: createRes.status,
        apiMessage: errJson?.error?.message,
        folderRoleLabel: 'ملف اختبار الجاهزية',
        folderName: testFileName,
        operation: 'create',
        parentId: orgFolderId,
      });
    }

    const created = await createRes.json();
    if (!created?.id || typeof created.id !== 'string') {
      throw new Error('استجابة اختبار الكتابة في Google Drive لم تُرجع معرّف ملف صالحاً.');
    }
    const fileId: string = created.id;
    createdFileId = fileId;

    if (created.appProperties) {
      const createPropsErr = findAppPropertiesMismatch(created.appProperties, expectedAppProperties);
      if (createPropsErr) {
        throw new Error(`تعارض خصائص ملف اختبار الكتابة بعد الإنشاء: ${createPropsErr}`);
      }
    }
    if (Array.isArray(created.parents) && !created.parents.includes(orgFolderId)) {
      throw new Error(
        `تم إنشاء ملف الاختبار خارج مجلد المؤسسة المحدد (${orgFolderId}).`
      );
    }

    // 2. Metadata read-back verification via files.get (bounded retry on transient 404)
    const retryDelays = [400, 800];
    let metaDataVerified = false;
    let last404Msg: string | undefined;

    for (let attempt = 0; attempt <= retryDelays.length; attempt++) {
      if (attempt > 0) {
        await sleep(retryDelays[attempt - 1]);
      }

      let metaRes: Response;
      try {
        metaRes = await fetch(
          `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
            fileId
          )}?fields=id,name,mimeType,parents,appProperties,size,trashed`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      } catch (networkErr: any) {
        throw new Error(
          `فشل الاتصال أثناء قراءة بيانات ملف الاختبار من Google Drive: ${
            networkErr?.message || networkErr
          }`
        );
      }

      if (metaRes.status === 404) {
        const errJson = await metaRes.json().catch(() => ({}));
        last404Msg = errJson?.error?.message;
        if (attempt < retryDelays.length) {
          continue;
        }
        throw formatDriveHttpError({
          status: 404,
          apiMessage: last404Msg,
          folderRoleLabel: 'ملف اختبار الجاهزية',
          folderName: testFileName,
          operation: 'get',
          folderId: fileId,
          parentId: orgFolderId,
        });
      }

      if (!metaRes.ok) {
        const errJson = await metaRes.json().catch(() => ({}));
        throw formatDriveHttpError({
          status: metaRes.status,
          apiMessage: errJson?.error?.message,
          folderRoleLabel: 'ملف اختبار الجاهزية',
          folderName: testFileName,
          operation: 'get',
          folderId: fileId,
          parentId: orgFolderId,
        });
      }

      const meta = await metaRes.json();
      if (meta.id !== fileId || meta.trashed === true) {
        throw new Error('تعذر التحقق من سلامة ملف الاختبار عبر files.get بعد إنشائه.');
      }
      if (meta.name !== testFileName) {
        throw new Error(`اسم ملف الاختبار المقروء (${meta.name}) لا يطابق الاسم المنشأ (${testFileName}).`);
      }
      const metaPropsErr = findAppPropertiesMismatch(meta.appProperties, expectedAppProperties);
      if (metaPropsErr) {
        throw new Error(`خصائص ملف الاختبار المقروءة لا تطابق المتوقع: ${metaPropsErr}`);
      }
      if (!Array.isArray(meta.parents) || !meta.parents.includes(orgFolderId)) {
        throw new Error('مسار المجلد الأب لملف الاختبار المقروء لا يطابق مجلد المؤسسة.');
      }

      metaDataVerified = true;
      break;
    }

    if (!metaDataVerified) {
      throw formatDriveHttpError({
        status: 404,
        apiMessage: last404Msg,
        folderRoleLabel: 'ملف اختبار الجاهزية',
        folderName: testFileName,
        operation: 'get',
        folderId: fileId,
        parentId: orgFolderId,
      });
    }

    // 3. Content read-back verification via files.get?alt=media
    let mediaRes: Response;
    try {
      mediaRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
    } catch (networkErr: any) {
      throw new Error(
        `فشل الاتصال أثناء قراءة محتوى ملف الاختبار من Google Drive: ${
          networkErr?.message || networkErr
        }`
      );
    }

    if (!mediaRes.ok) {
      const errJson = await mediaRes.json().catch(() => ({}));
      throw formatDriveHttpError({
        status: mediaRes.status,
        apiMessage: errJson?.error?.message,
        folderRoleLabel: 'محتوى ملف اختبار الجاهزية',
        folderName: testFileName,
        operation: 'get',
        folderId: fileId,
        parentId: orgFolderId,
      });
    }

    const readContentText = await mediaRes.text();
    let parsedContent: any;
    try {
      parsedContent = JSON.parse(readContentText);
    } catch {
      throw new Error('محتوى ملف الاختبار المقروء من Google Drive غير صالح أو تالف.');
    }

    if (
      parsedContent?.systemId !== 'al_eqfal' ||
      parsedContent?.purpose !== 'drive_write_read_health_check' ||
      parsedContent?.orgId !== org.id ||
      parsedContent?.orgFolderId !== orgFolderId ||
      parsedContent?.nonce !== nonce ||
      parsedContent?.checkedAt !== checkedAt
    ) {
      throw new Error(
        'فشلت مطابقة محتوى ملف الاختبار المقروء من Google Drive مع البيانات المكتوبة.'
      );
    }

    // 4. Delete temporary test file (or retain gracefully as verification file if delete is blocked)
    const cleanup = await bestEffortDelete(fileId);

    return {
      verified: true,
      verifiedAt: checkedAt,
      testFileId: fileId,
      testFileName,
      cleanedUp: cleanup.deleted,
      cleanupMessage: cleanup.note,
    };
  } catch (err) {
    if (createdFileId) {
      await bestEffortDelete(createdFileId);
    }
    throw err;
  }
}
