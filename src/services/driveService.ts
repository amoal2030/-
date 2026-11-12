/**
 * Google Drive Integration Service — AL EQFAL (Phase 1 Isolated Sandbox)
 * Strict Constraints Applied:
 * - Google Identity Services (GIS) Token Model
 * - Scopes: openid, email, https://www.googleapis.com/auth/drive.file
 * - Dynamic expires_in tracking with safety margin
 * - In-Memory ONLY session storage (Zero localStorage, Zero sessionStorage, Zero Firestore writes)
 * - Strict Owner Verification: Matching sub and email against Firebase Google Provider
 * - Clean discard on mismatch without automatic revoke
 * - Pagination-aware search (nextPageToken) for 'AL EQFAL - TEST'
 * - Multi-folder conflict halt
 */

import firebaseConfig from '../../firebase-applet-config.json';

export interface DriveTokenSession {
  accessToken: string;
  expiresIn: number;
  obtainedAt: number;
  expiresAt: number;
  email?: string;
  name?: string;
  sub?: string;
  verified: boolean;
}

export interface TestFolderInspectionResult {
  status: 'found_single' | 'found_multiple' | 'created_new' | 'error';
  folderId?: string;
  folderName?: string;
  matchingCount: number;
  matchingFolderIds?: string[];
  webViewLink?: string;
  message: string;
  hasAppProperties?: boolean;
}

// In-Memory state for the active browser session ONLY
let activeSession: DriveTokenSession | null = null;

/**
 * Dynamically loads the Google Identity Services client script
 */
export const loadGoogleIdentityScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && (window as any).google?.accounts?.oauth2) {
      return resolve();
    }
    const existingScript = document.getElementById('google-gis-script');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', (e) => reject(e));
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
 * Initiates GIS token flow and validates identity against the expected Google Provider UID
 */
export const requestDriveAuthorization = async (
  expectedGoogleUid: string,
  expectedEmail: string
): Promise<DriveTokenSession> => {
  await loadGoogleIdentityScript();

  const clientId = firebaseConfig.oAuthClientId;
  if (!clientId) {
    throw new Error('لم يتم العثور على Google OAuth Client ID في إعدادات النظام.');
  }

  return new Promise((resolve, reject) => {
    try {
      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'openid email https://www.googleapis.com/auth/drive.file',
        login_hint: expectedEmail || undefined,
        callback: async (tokenResponse: any) => {
          if (tokenResponse.error) {
            return reject(
              new Error(`خطأ في تفويض Google: ${tokenResponse.error_description || tokenResponse.error}`)
            );
          }
          if (!tokenResponse.access_token) {
            return reject(new Error('لم يُرجع خادم Google رمز وصول صالحاً.'));
          }

          const rawExpiresIn = Number(tokenResponse.expires_in);
          const expiresIn = !isNaN(rawExpiresIn) && rawExpiresIn > 0 ? rawExpiresIn : 3599;
          const obtainedAt = Date.now();
          // Dynamic expiration with 120-second safety margin
          const safetyMarginMs = 120 * 1000;
          const expiresAt = obtainedAt + expiresIn * 1000 - safetyMarginMs;
          const token = tokenResponse.access_token;

          // Identity Verification via Google UserInfo
          try {
            const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${token}` },
            });

            if (!userInfoRes.ok) {
              // Discard token immediately without calling revoke
              activeSession = null;
              return reject(new Error('تعذر استرداد بيانات الحساب من Google UserInfo للتحقق من الهوية.'));
            }

            const userInfo = await userInfoRes.json();

            // 1. Check email_verified
            if (!userInfo.email_verified) {
              activeSession = null;
              return reject(new Error('حساب Google غير موثق البريد الإلكتروني. يرجى توثيق البريد أولاً.'));
            }

            // 2. Strict Sub matching with Firebase Google Provider UID
            if (userInfo.sub !== expectedGoogleUid) {
              // Discard token from memory immediately WITHOUT calling revoke automatically
              activeSession = null;
              return reject(
                new Error(
                  `الحساب المختار (${userInfo.email || 'غير معروف'}) لا يطابق حساب Google المعتمد لمالك المؤسسة. تم رفض العملية والتخلص من الرمز من الذاكرة دون أي تغيير.`
                )
              );
            }

            // 3. Email matching check
            if (
              userInfo.email &&
              expectedEmail &&
              userInfo.email.toLowerCase().trim() !== expectedEmail.toLowerCase().trim()
            ) {
              activeSession = null;
              return reject(
                new Error(
                  `بريد الحساب المختار (${userInfo.email}) لا يطابق البريد المعتمد للمالك (${expectedEmail}). تم رفض التفويض وتفريغ الذاكرة.`
                )
              );
            }

            const session: DriveTokenSession = {
              accessToken: token,
              expiresIn,
              obtainedAt,
              expiresAt,
              email: userInfo.email,
              name: userInfo.name,
              sub: userInfo.sub,
              verified: true,
            };

            activeSession = session;
            resolve(session);
          } catch (verifyErr: any) {
            activeSession = null;
            reject(new Error(`فشل التحقق من مطابقة الهوية: ${verifyErr?.message || verifyErr}`));
          }
        },
      });

      client.requestAccessToken({ prompt: 'select_account' });
    } catch (err: any) {
      reject(new Error(`فشل تهيئة عميل التفويض: ${err?.message || err}`));
    }
  });
};

/**
 * Returns the active session if valid and unexpired; otherwise clears memory
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
 * Clears the session from memory
 */
export const clearDriveSession = (): void => {
  activeSession = null;
};

/**
 * Queries Google Drive for 'AL EQFAL - TEST' handling pagination and multi-folder conflicts
 */
export const inspectOrCreateTestFolder = async (
  token: string
): Promise<TestFolderInspectionResult> => {
  const folderName = 'AL EQFAL - TEST';
  // Base query without appProperties to detect manually created or existing folders
  const queryFilter = `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and 'root' in parents and trashed = false`;

  let allMatchingFolders: any[] = [];
  let pageToken: string | undefined = undefined;

  try {
    // Loop over all result pages via nextPageToken
    do {
      const url = new URL('https://www.googleapis.com/drive/v3/files');
      url.searchParams.set('q', queryFilter);
      url.searchParams.set(
        'fields',
        'nextPageToken, files(id, name, mimeType, appProperties, webViewLink, trashed)'
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
        throw new Error(errJson.error?.message || `فشل فحص مجلدات Drive (رمز الخطأ: ${res.status})`);
      }

      const data = await res.json();
      if (data.files && Array.isArray(data.files)) {
        allMatchingFolders = allMatchingFolders.concat(data.files);
      }
      pageToken = data.nextPageToken;
    } while (pageToken);

    // Multiple matching folders found
    if (allMatchingFolders.length > 1) {
      const ids = allMatchingFolders.map((f) => f.id);
      return {
        status: 'found_multiple',
        matchingCount: allMatchingFolders.length,
        matchingFolderIds: ids,
        message: `تم العثور على (${allMatchingFolders.length}) مجلدات متطابقة بالاسم '${folderName}' في Drive. تم إيقاف العملية فوراً لمنع التضارب وعدم الاختيار العشوائي. يرجى مراجعة المجلدات يدوياً.`,
      };
    }

    // Exactly one matching folder found
    if (allMatchingFolders.length === 1) {
      const existing = allMatchingFolders[0];
      const hasAppProps = existing.appProperties?.role === 'phase1_test_folder';

      // Read-back verification via files.get
      const verifyRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${existing.id}?fields=id,name,mimeType,webViewLink`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!verifyRes.ok) {
        throw new Error(
          'تم العثور على مجلد مطابق للاسم، ولكن تعذر التحقق من صلاحية قراءته بواسطة التطبيق (نطاق drive.file يتيح الوصول فقط للملفات المنشأة بواسطة التطبيق).'
        );
      }

      const verified = await verifyRes.json();

      return {
        status: 'found_single',
        folderId: verified.id,
        folderName: verified.name,
        matchingCount: 1,
        webViewLink: verified.webViewLink || `https://drive.google.com/drive/folders/${verified.id}`,
        hasAppProperties: hasAppProps,
        message: `تم العثور على المجلد التجريبي الحالي '${verified.name}' والتحقق من صلاحيته وإعادة اعتماده بنجاح دون إنشاء مجلد مكرر.`,
      };
    }

    // Zero matching folders found: Create exactly one
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
          parents: ['root'],
          appProperties: {
            role: 'phase1_test_folder',
            systemId: 'al_eqfal',
          },
        }),
      }
    );

    if (!createRes.ok) {
      const errJson = await createRes.json().catch(() => ({}));
      throw new Error(errJson.error?.message || `فشل إنشاء مجلد الاختبار في Drive (رمز: ${createRes.status})`);
    }

    const created = await createRes.json();

    // Verify immediately after creation
    const postVerifyRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${created.id}?fields=id,name,mimeType,webViewLink`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!postVerifyRes.ok) {
      throw new Error('تم إرسال طلب إنشاء المجلد لكن تعذر التحقق المباشر من وجوده في Drive.');
    }

    const postVerified = await postVerifyRes.json();

    return {
      status: 'created_new',
      folderId: postVerified.id,
      folderName: postVerified.name,
      matchingCount: 1,
      webViewLink: postVerified.webViewLink || `https://drive.google.com/drive/folders/${postVerified.id}`,
      hasAppProperties: true,
      message: `تم إنشاء مجلد الاختبار التجريبي '${postVerified.name}' في Google Drive والتحقق من وجوده وصلاحيته بنجاح تام.`,
    };
  } catch (error: any) {
    return {
      status: 'error',
      matchingCount: allMatchingFolders.length,
      message: error?.message || 'حدث خطأ أثناء فحص أو إنشاء مجلد الاختبار في Google Drive.',
    };
  }
};
