/**
 * Core Data Models & Types for الإقفال | AL EQFAL
 * Multi-Tenant Cloud Shift Closing & Cash Management System
 */

export type UserRole = 'manager' | 'employee';

export type ShiftPeriod = 'morning' | 'evening';

export type ClosingStatus = 'draft' | 'pending_review' | 'approved' | 'rejected';

export type SupportedLanguage = 'ar' | 'en' | 'ur';

export type ThemeMode = 'dark' | 'light';

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
  driveConnected: boolean;
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
