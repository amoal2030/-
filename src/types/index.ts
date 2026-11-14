/**
 * Core Data Models & Types for الإقفال | AL EQFAL
 * Multi-Tenant Cloud Shift Closing & Cash Management System
 */

export type UserRole = 'manager' | 'employee';

export type ShiftPeriod = 'morning' | 'evening';

export type ClosingStatus = 'draft' | 'pending_review' | 'approved' | 'rejected';

export type SupportedLanguage = 'ar' | 'en' | 'ur';

export type ThemeMode = 'dark' | 'light';

export interface DriveMonthFolderRef {
  folderId: string;
  folderName: string;
  webViewLink: string;
  branchId: string;
  yearMonth: string;
  updatedAt: string;
}

export type DriveHealthStatus = 'untested' | 'verified' | 'failed' | 'disconnected';

export type ClosingArchiveStatus = 'pending_drive_sync' | 'archived' | 'failed' | 'stale';

export interface ClosingArchiveRecord {
  closingId: string;
  orgId: string;
  branchId: string;
  yearMonth: string; // YYYY-MM
  archiveStatus: ClosingArchiveStatus;
  driveExcelFileId?: string;
  driveExcelFileName?: string;
  driveExcelWebViewLink?: string;
  driveMonthFolderId?: string;
  drivePayloadHash?: string;
  driveRevision?: number;
  previousDriveExcelFileId?: string;
  sourceCorrectionAt?: string;
  archivedAt?: string;
  archivedBy?: string;
  archiveError?: string;
  updatedAt: string;
}

export interface Organization {
  id: string;
  name: string;
  commercialRegistration?: string;
  activityType: string;
  currency: string;
  ownerId: string;
  ownerEmail: string;
  ownerName: string;
  driveFolderId?: string;
  driveFolderName?: string;
  driveFolderLink?: string;
  driveAccountEmail?: string;
  driveAccountName?: string;
  driveGoogleSub?: string;
  driveLinkedAt?: string;
  driveMonthFolderIds?: Record<string, DriveMonthFolderRef>;
  driveConnected: boolean;
  driveWriteVerified?: boolean;
  driveWriteVerifiedAt?: string;
  driveLastHealthStatus?: DriveHealthStatus;
  driveHealthError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Branch {
  id: string;
  orgId: string;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  isActive: boolean;
  driveFolderId?: string;
  driveFolderName?: string;
  driveFolderLink?: string;
  createdAt: string;
}

export interface UserProfile {
  uid: string;
  orgId: string;
  email: string;
  displayName: string;
  role: UserRole;
  branchId?: string;
  branchName?: string;
  phone?: string;
  isActive: boolean;
  permissions: {
    canCreateClosing: boolean;
    canViewAllClosings: boolean;
    canApproveClosings: boolean;
    canManageBranches: boolean;
    canManageEmployees: boolean;
    canExportReports: boolean;
  };
  createdAt: string;
}

export interface ShiftClosing {
  id: string;
  orgId: string;
  branchId: string;
  branchName: string;
  employeeId: string;
  employeeName: string;
  date: string; // YYYY-MM-DD
  period: ShiftPeriod;
  cashSales: number;
  cardSales: number;
  totalSales: number;     // cashSales + cardSales
  expenses: number;
  remainingInBox: number; // cashSales - expenses
  netPeriod: number;      // totalSales - expenses
  notes?: string;
  status: ClosingStatus;
  rejectionReason?: string;
  attachmentIds: string[];
  attachments?: AttachmentItem[];
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  correctionReason?: string;
  correctedBy?: string;
  correctedByName?: string;
  correctedAt?: string;
  previousValues?: {
    cashSales: number;
    cardSales: number;
    expenses: number;
    totalSales: number;
    remainingInBox: number;
    netPeriod: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface AttachmentItem {
  id: string;
  orgId: string;
  branchId: string;
  closingId?: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileUrl: string;
  driveFileId?: string;
  driveWebViewLink?: string;
  uploadedBy: string;
  uploadedByName: string;
  uploadedAt: string;
}

export interface AuditLog {
  id: string;
  orgId: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  targetType: 'closing' | 'branch' | 'employee' | 'drive' | 'organization';
  targetId: string;
  details: string;
  timestamp: string;
  previousValues?: Record<string, any>;
  newValues?: Record<string, any>;
}

export interface OrgSettings {
  orgId: string;
  defaultCurrency: string;
  enableDriveSync: boolean;
  requireReceiptAttachment: boolean;
  preventDuplicateClosing: boolean;
  morningShiftStart: string;
  morningShiftEnd: string;
  eveningShiftStart: string;
  eveningShiftEnd: string;
}

export interface FinancialSummary {
  totalCash: number;
  totalCard: number;
  totalSales: number;
  totalExpenses: number;
  totalRemainingInBox: number;
  totalNetPeriod: number;
  closingsCount: number;
  approvedCount: number;
  pendingCount: number;
  rejectedCount: number;
  draftCount: number;
}
