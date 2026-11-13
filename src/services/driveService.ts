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
 * - Idempotent folder provisioning with pagination (nextPageToken) and multi-match halt
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
  reused: boolean;
}

export interface BranchDriveProvisionResult {
  branchId: string;
  branchFolder: DriveFolderRef;
  monthFolder?: DriveMonthFolderRef;
}

export interface OrgDriveProvisionResult {
  orgFolder: DriveFolderRef;
  branchResults: BranchDriveProvisionResult[];
  monthFolderMap: Record<string, DriveMonthFolderRef>;
}

// In-Memory token session ONLY for the active browser tab
let activeSession: DriveTokenSession | null = null;

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
 * Requests OAuth access token via GIS and strictly validates Google identity
 * against the organization owner's Firebase Google Provider.
 */
export const requestDriveAuthorization = async (
  expectedGoogleUid: string,
  expectedEmail: string
): Promise<DriveTokenSession> => {
  if (!expectedGoogleUid || !expectedEmail) {
    throw new Error('بيانات مزود Google لحساب المالك غير مكتملة في الجلسة الحالية.');
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
        login_hint: expectedEmail,
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
          // Deduct 120 seconds safety margin (clamped safely if token lifetime is short)
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
                new Error('تعذر التحقق من هوية حساب Google عبر نقطة UserInfo. تم إسقاط الرمز من الذاكرة.')
              );
            }

            const userInfo = await userInfoRes.json();

            // 1. Require verified Google email
            if (userInfo.email_verified !== true) {
              activeSession = null;
              return reject(new Error('بريد حساب Google غير موثق (email_verified !== true). تم رفض الربط.'));
            }

            // 2. Strict Sub matching with Firebase Google Provider UID
            if (!userInfo.sub || userInfo.sub !== expectedGoogleUid) {
              activeSession = null;
              return reject(
                new Error(
                  `الحساب المختار (${userInfo.email || 'غير معروف'}) لا يطابق هوية Google المسجلة لمالك المؤسسة. تم رفض الربط والتخلص من رمز الوصول من الذاكرة دون استدعاء revoke.`
                )
              );
            }

            // 3. Strict Email matching
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
            reject(new Error(`تعذر إتمام تفويض Google (${errType}). تأكد من إضافة النطاق في Authorized JavaScript origins.`));
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
 * Verifies if an already-recorded Drive folder ID still exists, is not trashed,
 * and belongs to the expected parent (when specified).
 */
async function verifyExistingFolderById(
  token: string,
  folderId: string,
  expectedParentId?: string
): Promise<DriveFolderRef | null> {
  try {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
        folderId
      )}?fields=id,name,mimeType,webViewLink,trashed,parents`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (
      data.trashed === true ||
      data.mimeType !== 'application/vnd.google-apps.folder'
    ) {
      return null;
    }
    if (expectedParentId && expectedParentId !== 'root') {
      if (!Array.isArray(data.parents) || !data.parents.includes(expectedParentId)) {
        return null;
      }
    }
    return {
      folderId: data.id,
      folderName: data.name,
      webViewLink: data.webViewLink || `https://drive.google.com/drive/folders/${data.id}`,
      reused: true,
    };
  } catch {
    return null;
  }
}

/**
 * Idempotently locates or creates a folder in Google Drive:
 * 1. If existingFolderId is stored and valid in Drive, reuses it.
 * 2. Searches all pages (nextPageToken) by name, mimeType, parent, and trashed=false.
 * 3. Halts on >1 match without deleting or guessing.
 * 4. Reuses on 1 match (after files.get verification).
 * 5. Creates on 0 matches and verifies immediately with files.get.
 */
export async function ensureDriveFolder(params: {
  token: string;
  folderName: string;
  parentId: string;
  appProperties: Record<string, string>;
  existingFolderId?: string;
}): Promise<DriveFolderRef> {
  const { token, folderName, parentId, appProperties, existingFolderId } = params;

  // 1. Check recorded folderId first if available
  if (existingFolderId) {
    const verifiedExisting = await verifyExistingFolderById(token, existingFolderId, parentId);
    if (verifiedExisting) {
      return verifiedExisting;
    }
  }

  // 2. Search across all pages using base criteria (name + folder mimeType + parent + trashed=false)
  const escapedName = escapeDriveQueryValue(folderName);
  const escapedParent = escapeDriveQueryValue(parentId);
  const queryFilter = `name = '${escapedName}' and mimeType = 'application/vnd.google-apps.folder' and '${escapedParent}' in parents and trashed = false`;

  let matchingFolders: any[] = [];
  let pageToken: string | undefined = undefined;

  do {
    const url = new URL('https://www.googleapis.com/drive/v3/files');
    url.searchParams.set('q', queryFilter);
    url.searchParams.set(
      'fields',
      'nextPageToken, files(id, name, mimeType, appProperties, webViewLink, trashed, parents)'
    );
    url.searchParams.set('pageSize', '50');
    if (pageToken) {
      url.searchParams.set('pageToken', pageToken);
    }

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      if (res.status === 401) {
        clearDriveSession();
        throw new Error('انتهت صلاحية رمز الوصول إلى Google Drive. يرجى إعادة الربط.');
      }
      throw new Error(errJson.error?.message || `فشل البحث عن المجلد '${folderName}' في Drive (رمز: ${res.status})`);
    }

    const data = await res.json();
    if (Array.isArray(data.files)) {
      matchingFolders = matchingFolders.concat(data.files);
    }
    pageToken = data.nextPageToken;
  } while (pageToken);

  // 3. Multiple matches -> halt cleanly without random pick
  if (matchingFolders.length > 1) {
    const idsList = matchingFolders.map((f) => f.id).join(' , ');
    throw new Error(
      `تم العثور على (${matchingFolders.length}) مجلدات متطابقة بالاسم "${folderName}" في Drive (المعرفات: ${idsList}). تم إيقاف العملية لمنع التضارب؛ يرجى مراجعة المجلدات في Google Drive أولاً.`
    );
  }

  // 4. Single match -> verify accessibility and reuse
  if (matchingFolders.length === 1) {
    const found = matchingFolders[0];
    const verified = await verifyExistingFolderById(token, found.id, parentId);
    if (!verified) {
      throw new Error(
        `تم العثور على مجلد باسم "${folderName}" لكن تعذر الوصول إليه بصلاحية drive.file.`
      );
    }
    return verified;
  }

  // 5. Zero matches -> create folder with appProperties and verify immediately
  const createRes = await fetch(
    'https://www.googleapis.com/drive/v3/files?fields=id,name,mimeType,webViewLink,appProperties',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentId],
        appProperties,
      }),
    }
  );

  if (!createRes.ok) {
    const errJson = await createRes.json().catch(() => ({}));
    if (createRes.status === 401) {
      clearDriveSession();
      throw new Error('انتهت صلاحية رمز الوصول أثناء إنشاء المجلد. يرجى إعادة التفويض.');
    }
    throw new Error(
      errJson.error?.message || `فشل إنشاء المجلد "${folderName}" في Google Drive (رمز: ${createRes.status}).`
    );
  }

  const created = await createRes.json();
  const postVerified = await verifyExistingFolderById(token, created.id, parentId);
  if (!postVerified) {
    throw new Error(`تم إنشاء المجلد "${folderName}" ولكن تعذر التحقق المباشر من وجوده في Drive.`);
  }

  return {
    ...postVerified,
    reused: false,
  };
}

/**
 * Provisions the full organization hierarchy in the owner's Google Drive:
 *   AL EQFAL - [Organization Name] - [OrgID]
 *     └── [Branch Name] - [Branch Code]
 *           └── [YYYY-MM]
 */
export async function provisionOrganizationDriveHierarchy(params: {
  token: string;
  org: Organization;
  branches: Branch[];
  yearMonth?: string;
}): Promise<OrgDriveProvisionResult> {
  const { token, org, branches } = params;
  const targetYearMonth = params.yearMonth || new Date().toISOString().slice(0, 7);

  // 1. Organization Root Folder
  const orgFolderName = `AL EQFAL - ${org.name.trim()} - ${org.id}`;
  const orgFolder = await ensureDriveFolder({
    token,
    folderName: orgFolderName,
    parentId: 'root',
    existingFolderId: org.driveFolderId || undefined,
    appProperties: {
      systemId: 'al_eqfal',
      role: 'org_root',
      orgId: org.id,
    },
  });

  // 2. Branch Folders & Current Month Folders
  const branchResults: BranchDriveProvisionResult[] = [];
  const monthFolderMap: Record<string, DriveMonthFolderRef> = {
    ...(org.driveMonthFolderIds || {}),
  };

  for (const branch of branches) {
    const branchFolderName = `${branch.name.trim()} - ${branch.code.trim()}`;
    const branchFolder = await ensureDriveFolder({
      token,
      folderName: branchFolderName,
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
      branchFolder,
      monthFolder: monthEntry,
    });
  }

  return {
    orgFolder,
    branchResults,
    monthFolderMap,
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
    parentId: 'root',
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
