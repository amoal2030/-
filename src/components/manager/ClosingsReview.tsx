import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { ShiftClosing, ClosingArchiveRecord } from '../../types';
import { formatCurrency, formatDate, calculateShiftTotals } from '../../utils/accounting';
import {
  FileSpreadsheet,
  CheckCircle2,
  RotateCcw,
  AlertCircle,
  Eye,
  Filter,
  Calendar,
  Lock,
  MessageSquare,
  X,
  Sparkles,
  DollarSign,
  Edit3,
  History,
  CloudUpload,
  ExternalLink,
  Download,
  RefreshCw,
  ShieldCheck
} from 'lucide-react';

export const ClosingsReview: React.FC = () => {
  const {
    currentUser,
    closings,
    closingArchives,
    branches,
    currentOrg,
    reviewShiftClosing,
    adminCorrectClosing,
    archiveClosingToDrive,
    archivePendingClosingsToDrive,
    downloadArchivedExcelFromDrive,
  } = useAuth();
  const { language, t } = useLanguage();

  // Filters
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>('');

  // Selected closing for detail modal
  const [activeClosing, setActiveClosing] = useState<ShiftClosing | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Administrative correction states
  const [isCorrecting, setIsCorrecting] = useState(false);
  const [corrCash, setCorrCash] = useState('');
  const [corrCard, setCorrCard] = useState('');
  const [corrExpenses, setCorrExpenses] = useState('');
  const [corrReason, setCorrReason] = useState('');

  // Drive Archival states
  const [archiveBusyId, setArchiveBusyId] = useState<string | null>(null);
  const [downloadBusyId, setDownloadBusyId] = useState<string | null>(null);
  const [batchArchiveLoading, setBatchArchiveLoading] = useState(false);
  const [archiveFeedback, setArchiveFeedback] = useState<{
    type: 'success' | 'warning' | 'error';
    message: string;
  } | null>(null);

  const corrCalc = calculateShiftTotals(corrCash, corrCard, corrExpenses);

  const archiveMap = new Map<string, ClosingArchiveRecord>(
    closingArchives.map((a) => [a.closingId, a])
  );

  const pendingSyncClosings = closings.filter((c) => {
    if (c.status !== 'approved') return false;
    const arch = archiveMap.get(c.id);
    return !arch || arch.archiveStatus !== 'archived';
  });

  const getArchiveBadge = (closing: ShiftClosing) => {
    if (closing.status !== 'approved') {
      return {
        label: 'غير مطلوب بعد',
        class: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
      };
    }
    const arch = archiveMap.get(closing.id);
    if (!arch || arch.archiveStatus === 'pending_drive_sync') {
      return {
        label: 'بانتظار الأرشفة',
        class: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
      };
    }
    if (arch.archiveStatus === 'archived') {
      return {
        label: `مؤرشف v${arch.driveRevision || 1}`,
        class: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30 font-bold',
      };
    }
    if (arch.archiveStatus === 'stale') {
      return {
        label: 'يحتاج إعادة أرشفة',
        class: 'bg-amber-500/20 text-amber-400 border-amber-500/40 font-bold',
      };
    }
    return {
      label: 'فشل الأرشفة',
      class: 'bg-rose-500/15 text-rose-400 border-rose-500/30 font-bold',
    };
  };

  const handleArchiveSingle = async (closingId: string) => {
    setArchiveBusyId(closingId);
    setActionError(null);
    setArchiveFeedback(null);
    try {
      const saved = await archiveClosingToDrive(closingId, { interactiveAuthIfNeeded: true });
      setArchiveFeedback({
        type: 'success',
        message: `تم إنشاء ورفع والتحقق من ملف Excel (${saved.driveExcelFileName}) — الإصدار v${saved.driveRevision}.`,
      });
    } catch (err: any) {
      const msg = err?.message || 'فشل أرشفة ملف Excel في Google Drive.';
      setActionError(msg);
      setArchiveFeedback({ type: 'error', message: msg });
    } finally {
      setArchiveBusyId(null);
    }
  };

  const handleBatchArchive = async () => {
    if (pendingSyncClosings.length === 0) return;
    setBatchArchiveLoading(true);
    setArchiveFeedback(null);
    try {
      const result = await archivePendingClosingsToDrive(pendingSyncClosings.map((c) => c.id));
      if (result.failed.length === 0) {
        setArchiveFeedback({
          type: 'success',
          message: `تمت أرشفة والتحقق من (${result.succeeded.length}) ملف Excel بنجاح في Google Drive.`,
        });
      } else {
        setArchiveFeedback({
          type: 'warning',
          message: `تمت أرشفة (${result.succeeded.length}) ملفات، وفشل (${result.failed.length}): ${result.failed[0].error}`,
        });
      }
    } catch (err: any) {
      setArchiveFeedback({
        type: 'error',
        message: err?.message || 'تعذر تنفيذ المزامنة الجماعية مع Google Drive.',
      });
    } finally {
      setBatchArchiveLoading(false);
    }
  };

  const handleDownloadOriginalFromDrive = async (closingId: string) => {
    setDownloadBusyId(closingId);
    setActionError(null);
    setArchiveFeedback(null);
    try {
      const downloaded = await downloadArchivedExcelFromDrive(closingId);
      setArchiveFeedback({
        type: 'success',
        message: `تم تنزيل والتحقق من ملف Excel الأصلي المخزن في Google Drive (${downloaded.fileName} — v${downloaded.revision}).`,
      });
    } catch (err: any) {
      const msg = err?.message || 'فشل تنزيل ملف Excel الأصلي من Google Drive.';
      setActionError(msg);
      setArchiveFeedback({ type: 'error', message: msg });
    } finally {
      setDownloadBusyId(null);
    }
  };

  const filteredClosings = closings.filter((c) => {
    if (selectedBranchId !== 'all' && c.branchId !== selectedBranchId) return false;
    if (selectedStatus !== 'all' && c.status !== selectedStatus) return false;
    if (selectedPeriod !== 'all' && c.period !== selectedPeriod) return false;
    if (selectedDate && c.date !== selectedDate) return false;
    return true;
  });

  const handleApprove = async () => {
    if (!activeClosing) return;
    setReviewLoading(true);
    setActionError(null);
    setArchiveFeedback(null);
    const targetId = activeClosing.id;
    try {
      await reviewShiftClosing(targetId, 'approve');
      // Try automatic Drive archival silently if an active verified RAM Drive session exists
      try {
        const saved = await archiveClosingToDrive(targetId, { interactiveAuthIfNeeded: false });
        setArchiveFeedback({
          type: 'success',
          message: `تم اعتماد الإقفال وأرشفة ملف Excel (${saved.driveExcelFileName}) والتحقق منه في Google Drive.`,
        });
      } catch (archErr: any) {
        setArchiveFeedback({
          type: 'warning',
          message:
            archErr?.message ||
            'تم اعتماد الإقفال رسمياً. يرجى الضغط على «أرشفة في Google Drive» لرفع ملف Excel.',
        });
      }
      setActiveClosing(null);
    } catch (err: any) {
      setActionError(err?.message || 'فشل اعتماد الإقفال.');
    } finally {
      setReviewLoading(false);
    }
  };

  const handleReject = async () => {
    if (!activeClosing) return;
    if (!rejectionReason.trim()) {
      setActionError('يجب كتابة سبب الإعادة للموظف لتوضيح التعديل المطلوب.');
      return;
    }
    setReviewLoading(true);
    setActionError(null);
    try {
      await reviewShiftClosing(activeClosing.id, 'reject', rejectionReason);
      setActiveClosing(null);
      setIsRejecting(false);
      setRejectionReason('');
    } catch (err: any) {
      setActionError(err?.message || 'فشل إرجاع الإقفال.');
    } finally {
      setReviewLoading(false);
    }
  };

  const handleAdminCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClosing) return;
    if (!corrReason.trim()) {
      setActionError('يجب كتابة سبب ومبرر التصحيح الإداري لتعديل إقفال معتمد.');
      return;
    }

    setReviewLoading(true);
    setActionError(null);
    setArchiveFeedback(null);
    const targetId = activeClosing.id;
    try {
      await adminCorrectClosing({
        closingId: targetId,
        cashSales: corrCalc.cashSales,
        cardSales: corrCalc.cardSales,
        expenses: corrCalc.expenses,
        correctionReason: corrReason,
      });
      // Attempt immediate re-archival (v+1) if RAM Drive session is active
      try {
        const saved = await archiveClosingToDrive(targetId, { interactiveAuthIfNeeded: false });
        setArchiveFeedback({
          type: 'success',
          message: `تم توثيق التصحيح الإداري وإصدار ملف Excel الجديد v${saved.driveRevision} (${saved.driveExcelFileName}) في Google Drive.`,
        });
      } catch (archErr: any) {
        setArchiveFeedback({
          type: 'warning',
          message:
            archErr?.message ||
            'تم توثيق التصحيح الإداري وأصبح الإقفال بحاجة لإعادة الأرشفة في Google Drive.',
        });
      }
      setActiveClosing(null);
      setIsCorrecting(false);
    } catch (err: any) {
      setActionError(err?.message || 'فشل تنفيذ التصحيح الإداري.');
    } finally {
      setReviewLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-amber-500" />
            <span>مراجعة واعتماد إقفالات الورديات ({filteredClosings.length})</span>
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            مراجعة أرقام النقد والشبكة والمشتريات واعتمادها رسمياً، أو إرجاعها للتعديل، أو إجراء تصحيح إداري موثق
          </span>
        </div>

        {(selectedBranchId !== 'all' || selectedStatus !== 'all' || selectedPeriod !== 'all' || selectedDate) && (
          <button
            onClick={() => {
              setSelectedBranchId('all');
              setSelectedStatus('all');
              setSelectedPeriod('all');
              setSelectedDate('');
            }}
            className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline"
          >
            إعادة تعيين الفلاتر
          </button>
        )}
      </div>

      {/* Pending Drive Archival Banner */}
      {pendingSyncClosings.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-amber-700 dark:text-amber-300">
            <CloudUpload className="w-5 h-5 text-amber-500 shrink-0" />
            <div>
              <span className="font-bold block">
                يوجد ({pendingSyncClosings.length}) إقفال معتمد بانتظار الأرشفة أو التحديث في Google Drive
              </span>
              <span className="text-[11px] opacity-85">
                يتم توليد ملفات Excel (.xlsx) وتخزينها في مجلد الشهر والتحقق من قراءتها قبل اعتماد حالة الأرشفة.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleBatchArchive}
            disabled={batchArchiveLoading}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-sm flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${batchArchiveLoading ? 'animate-spin' : ''}`} />
            <span>
              {batchArchiveLoading ? 'جاري رفع والتحقق من الملفات...' : 'أرشفة الكل في Google Drive'}
            </span>
          </button>
        </div>
      )}

      {/* Archival Operation Feedback */}
      {archiveFeedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 ${
            archiveFeedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
              : archiveFeedback.type === 'warning'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
          }`}
        >
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>{archiveFeedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setArchiveFeedback(null)}
            className="opacity-70 hover:opacity-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 rounded-2xl bg-white dark:bg-[#0c1829] border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
            الفرع
          </label>
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#070e17] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
          >
            <option value="all">جميع الفروع</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
            حالة الإقفال
          </label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#070e17] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
          >
            <option value="all">جميع الحالات</option>
            <option value="pending_review">مرسل للمراجعة (بانتظار الاعتماد)</option>
            <option value="approved">معتمد رسمي</option>
            <option value="rejected">معاد للتعديل</option>
            <option value="draft">مسودة</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
            فترة الوردية
          </label>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#070e17] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
          >
            <option value="all">الصباحية والمسائية</option>
            <option value="morning">الفترة الصباحية</option>
            <option value="evening">الفترة المسائية</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
            التاريخ المحدد
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#070e17] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
          />
        </div>
      </div>

      {/* Responsive View: Mobile Cards (Phones & Small Tablets < 768px) */}
      <div className="block md:hidden space-y-3">
        {filteredClosings.map((closing) => {
          const statusBadges: Record<string, { label: string; class: string }> = {
            draft: {
              label: 'مسودة',
              class: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
            },
            pending_review: {
              label: 'مرسل للمراجعة',
              class: 'bg-amber-500/20 text-amber-500 border-amber-500/40 animate-pulse font-bold',
            },
            approved: {
              label: 'معتمد',
              class: 'bg-amber-500/15 text-amber-400 border-amber-500/30 font-bold',
            },
            rejected: {
              label: 'معاد للتعديل',
              class: 'bg-rose-500/15 text-rose-400 border-rose-500/30 font-bold',
            },
          };
          const badge = statusBadges[closing.status] || statusBadges.draft;

          return (
            <div
              key={closing.id}
              className="p-4 rounded-2xl bg-white dark:bg-[#0c1829] border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-2.5">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {closing.branchName}
                  </h4>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <span>{closing.date}</span>
                    <span>•</span>
                    <span>{closing.period === 'morning' ? 'وردية صباحية' : 'وردية مسائية'}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${badge.class}`}>
                    {badge.label}
                  </span>
                  {closing.status === 'approved' && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        getArchiveBadge(closing).class
                      }`}
                    >
                      {getArchiveBadge(closing).label}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#070e17] border border-slate-200/70 dark:border-slate-800/70">
                  <span className="text-[10px] text-slate-400 block font-medium">إجمالي المبيعات</span>
                  <span className="text-slate-900 dark:text-white font-bold font-mono text-sm">
                    {closing.totalSales.toFixed(2)}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#070e17] border border-slate-200/70 dark:border-slate-800/70">
                  <span className="text-[10px] text-slate-400 block font-medium">صافي الفترة</span>
                  <span className="text-amber-500 font-bold font-mono text-sm">
                    {closing.netPeriod.toFixed(2)}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50/50 dark:bg-[#070e17]/50 text-[11px] flex justify-between">
                  <span className="text-slate-400">النقد:</span>
                  <span className="font-mono text-amber-500 font-bold">{closing.cashSales.toFixed(2)}</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50/50 dark:bg-[#070e17]/50 text-[11px] flex justify-between">
                  <span className="text-slate-400">الشبكة:</span>
                  <span className="font-mono text-sky-400 font-bold">{closing.cardSales.toFixed(2)}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setActiveClosing(closing);
                  setIsRejecting(false);
                  setIsCorrecting(false);
                  setRejectionReason('');
                  setActionError(null);
                  setCorrCash(String(closing.cashSales));
                  setCorrCard(String(closing.cardSales));
                  setCorrExpenses(String(closing.expenses));
                  setCorrReason('');
                }}
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-[#0b192c] hover:bg-[#0f2038] text-white border border-amber-500/40 flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                <Eye className="w-3.5 h-3.5 text-amber-400" />
                <span>فحص ومراجعة الإقفال</span>
              </button>
            </div>
          );
        })}

        {filteredClosings.length === 0 && (
          <div className="py-12 text-center text-xs text-slate-400 bg-white dark:bg-[#0c1829] rounded-2xl border border-slate-200 dark:border-slate-800">
            لا توجد إقفالات مطابقة للفلاتر المختارة حالياً.
          </div>
        )}
      </div>

      {/* Desktop Closings Table (Screens >= 768px) */}
      <div className="hidden md:block bg-white dark:bg-[#0c1829] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
        <table className="w-full text-start text-xs sm:text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="p-4 text-start">التاريخ</th>
              <th className="p-4 text-start">الفرع</th>
              <th className="p-4 text-start">الموظف</th>
              <th className="p-4 text-start">الفترة</th>
              <th className="p-4 text-start">النقد</th>
              <th className="p-4 text-start">الشبكة</th>
              <th className="p-4 text-start">إجمالي المبيعات</th>
              <th className="p-4 text-start">المشتريات</th>
              <th className="p-4 text-start">الباقي بالصندوق</th>
              <th className="p-4 text-start">صافي الفترة</th>
              <th className="p-4 text-start">الحالة</th>
              <th className="p-4 text-start">أرشفة Drive</th>
              <th className="p-4 text-start">معاينة</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
            {filteredClosings.map((closing) => {
              const statusBadges: Record<string, { label: string; class: string }> = {
                draft: {
                  label: 'مسودة',
                  class: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
                },
                pending_review: {
                  label: 'مرسل للمراجعة',
                  class: 'bg-amber-500/20 text-amber-500 border-amber-500/40 animate-pulse font-bold',
                },
                approved: {
                  label: 'معتمد',
                  class: 'bg-amber-500/15 text-amber-400 border-amber-500/30 font-bold',
                },
                rejected: {
                  label: 'معاد للتعديل',
                  class: 'bg-rose-500/15 text-rose-400 border-rose-500/30 font-bold',
                },
              };

              const badge = statusBadges[closing.status] || statusBadges.draft;

              return (
                <tr
                  key={closing.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="p-4 font-bold text-slate-900 dark:text-white">
                    {closing.date}
                  </td>
                  <td className="p-4 font-sans text-slate-700 dark:text-slate-300">
                    {closing.branchName}
                  </td>
                  <td className="p-4 font-sans text-slate-700 dark:text-slate-300">
                    {closing.employeeName}
                  </td>
                  <td className="p-4 font-sans">
                    <span className="px-2 py-0.5 rounded text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {closing.period === 'morning' ? 'صباحية' : 'مسائية'}
                    </span>
                  </td>
                  <td className="p-4 text-amber-500 font-bold">
                    {closing.cashSales.toFixed(2)}
                  </td>
                  <td className="p-4 text-sky-400 font-bold">
                    {closing.cardSales.toFixed(2)}
                  </td>
                  <td className="p-4 font-black text-slate-900 dark:text-white">
                    {closing.totalSales.toFixed(2)}
                  </td>
                  <td className="p-4 text-rose-400">
                    {closing.expenses.toFixed(2)}
                  </td>
                  <td className="p-4 text-sky-400 font-bold">
                    {closing.remainingInBox.toFixed(2)}
                  </td>
                  <td className="p-4 text-amber-400 font-bold">
                    {closing.netPeriod.toFixed(2)}
                  </td>
                  <td className="p-4 font-sans">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${badge.class}`}
                    >
                      {badge.label}
                    </span>
                  </td>
                  <td className="p-4 font-sans">
                    {(() => {
                      const archBadge = getArchiveBadge(closing);
                      const archRecord = archiveMap.get(closing.id);
                      const needsSync =
                        closing.status === 'approved' &&
                        (!archRecord || archRecord.archiveStatus !== 'archived');
                      return (
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${archBadge.class}`}
                            title={archRecord?.archiveError || archRecord?.driveExcelFileName || ''}
                          >
                            {archBadge.label}
                          </span>
                          {needsSync && (
                            <button
                              type="button"
                              onClick={() => handleArchiveSingle(closing.id)}
                              disabled={archiveBusyId === closing.id}
                              title="أرشفة ملف Excel في Google Drive"
                              className="p-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-500 border border-amber-500/30 disabled:opacity-50"
                            >
                              <CloudUpload
                                className={`w-3.5 h-3.5 ${
                                  archiveBusyId === closing.id ? 'animate-pulse' : ''
                                }`}
                              />
                            </button>
                          )}
                        </div>
                      );
                    })()}
                  </td>
                  <td className="p-4 font-sans">
                    <button
                      onClick={() => {
                        setActiveClosing(closing);
                        setIsRejecting(false);
                        setIsCorrecting(false);
                        setRejectionReason('');
                        setActionError(null);
                        setCorrCash(String(closing.cashSales));
                        setCorrCard(String(closing.cardSales));
                        setCorrExpenses(String(closing.expenses));
                        setCorrReason('');
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-white transition-colors flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5 text-amber-500" />
                      <span>فحص</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredClosings.length === 0 && (
          <div className="py-12 text-center text-xs text-slate-400">
            لا توجد إقفالات مطابقة للفلاتر المختارة حالياً.
          </div>
        )}
      </div>

      {/* Detail & Review Modal */}
      {activeClosing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0c1829] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-[#0b192c] to-[#0f2038] text-white flex items-center justify-between border-b border-amber-500/20 sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold">
                    إقفال {activeClosing.branchName} •{' '}
                    {activeClosing.period === 'morning' ? 'الفترة الصباحية' : 'الفترة المسائية'}
                  </h4>
                  <span className="text-xs text-slate-300 font-mono">
                    التاريخ: {activeClosing.date} • الموظف: {activeClosing.employeeName}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setActiveClosing(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {actionError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}

              {/* Status Notice */}
              {activeClosing.status === 'approved' && !isCorrecting && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-700 dark:text-amber-300 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>هذا الإقفال معتمد رسمياً ومقفل ضد التعديلات العادية.</span>
                  </div>
                  <button
                    onClick={() => setIsCorrecting(true)}
                    className="px-3 py-1.5 rounded-lg font-bold text-xs bg-amber-500 text-slate-950 hover:bg-amber-400 flex items-center gap-1.5 shrink-0"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>طلب تصحيح إداري مبرر</span>
                  </button>
                </div>
              )}

              {/* Google Drive Excel Archival Details & Controls (Approved Closings Only) */}
              {activeClosing.status === 'approved' && (() => {
                const arch = archiveMap.get(activeClosing.id);
                const isArchived = arch?.archiveStatus === 'archived';
                const hasDriveFile = Boolean(arch?.driveExcelFileId);
                const isOrgOwner = Boolean(currentUser && currentOrg && currentUser.uid === currentOrg.ownerId);
                const archBadge = getArchiveBadge(activeClosing);
                const driveUrl = arch?.driveExcelWebViewLink
                  ? currentOrg?.driveAccountEmail
                    ? `${arch.driveExcelWebViewLink}${
                        arch.driveExcelWebViewLink.includes('?') ? '&' : '?'
                      }authuser=${encodeURIComponent(currentOrg.driveAccountEmail)}`
                    : arch.driveExcelWebViewLink
                  : null;

                return (
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#070e17] border border-slate-200 dark:border-slate-800 text-xs space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                        <CloudUpload className="w-4 h-4 text-amber-500" />
                        <span>أرشفة Excel في Google Drive</span>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] border ${archBadge.class}`}>
                        {archBadge.label}
                      </span>
                    </div>

                    {arch?.driveExcelFileName && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-300 font-mono">
                        <div className="truncate" title={arch.driveExcelFileName}>
                          الملف: {arch.driveExcelFileName}
                        </div>
                        <div>
                          الإصدار: v{arch.driveRevision || 1} • الشهر: {arch.yearMonth}
                        </div>
                        {arch.drivePayloadHash && (
                          <div className="sm:col-span-2 truncate text-slate-500" title={arch.drivePayloadHash}>
                            SHA-256: {arch.drivePayloadHash}
                          </div>
                        )}
                      </div>
                    )}

                    {arch?.archiveStatus === 'failed' && arch.archiveError && (
                      <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-[11px]">
                        سبب آخر فشل: {arch.archiveError}
                      </div>
                    )}

                    {!isOrgOwner && (
                      <div className="p-2.5 rounded-xl bg-slate-200/70 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 text-[11px]">
                        عمليات الرفع والتنزيل المباشر من Google Drive مقتصرة على مالك المؤسسة المرتبط حسابه ({currentOrg?.ownerName}).
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {!isArchived && (
                        <button
                          type="button"
                          onClick={() => handleArchiveSingle(activeClosing.id)}
                          disabled={archiveBusyId === activeClosing.id || !isOrgOwner}
                          className="px-3.5 py-2 rounded-xl font-bold text-xs bg-amber-400 hover:bg-amber-300 text-slate-950 flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <CloudUpload className="w-3.5 h-3.5" />
                          <span>
                            {archiveBusyId === activeClosing.id
                              ? 'جاري الإنشاء والرفع والتحقق...'
                              : arch?.archiveStatus === 'stale'
                              ? 'إصدار وأرشفة النسخة المحدثة في Drive'
                              : arch?.archiveStatus === 'failed'
                              ? 'إعادة المحاولة في Google Drive'
                              : 'أرشفة في Google Drive'}
                          </span>
                        </button>
                      )}

                      {hasDriveFile && (
                        <button
                          type="button"
                          onClick={() => handleDownloadOriginalFromDrive(activeClosing.id)}
                          disabled={downloadBusyId === activeClosing.id || archiveBusyId === activeClosing.id || !isOrgOwner}
                          className="px-3.5 py-2 rounded-xl font-semibold text-xs bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-white border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <Download className="w-3.5 h-3.5 text-sky-400" />
                          <span>
                            {downloadBusyId === activeClosing.id
                              ? 'جاري التنزيل والتحقق من Drive...'
                              : `تنزيل الملف الأصلي من Google Drive (v${arch?.driveRevision || 1})`}
                          </span>
                        </button>
                      )}

                      {driveUrl && (
                        <a
                          href={driveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3.5 py-2 rounded-xl font-semibold text-xs bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-white border border-slate-300 dark:border-slate-700 flex items-center gap-1.5"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-amber-500" />
                          <span>فتح في Google Drive</span>
                        </a>
                      )}
                    </div>

                    {!hasDriveFile && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        لا يوجد ملف Excel محفوظ في Google Drive لهذا الإقفال حتى الآن. اضغط «أرشفة في Google Drive» لحفظ النسخة الرسمية الأولى.
                      </p>
                    )}
                  </div>
                );
              })()}

              {/* Previous Correction History if exists */}
              {activeClosing.previousValues && (
                <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 text-xs space-y-2">
                  <div className="font-bold flex items-center gap-1.5 text-amber-500">
                    <History className="w-4 h-4" />
                    <span>سجل التصحيح الإداري السابق (موثق في Audit Logs):</span>
                  </div>
                  <div className="text-slate-600 dark:text-slate-300">
                    <div>سبب التصحيح: {activeClosing.correctionReason}</div>
                    <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      القيم السابقة: نقد {activeClosing.previousValues.cashSales} | شبكة {activeClosing.previousValues.cardSales} | مشتريات {activeClosing.previousValues.expenses} | إجمالي {activeClosing.previousValues.totalSales}
                    </div>
                  </div>
                </div>
              )}

              {activeClosing.status === 'rejected' && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-700 dark:text-rose-400 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">سبب الإرجاع للتعديل:</span>
                    <span>{activeClosing.rejectionReason}</span>
                  </div>
                </div>
              )}

              {/* Administrative Correction Form */}
              {isCorrecting ? (
                <form onSubmit={handleAdminCorrection} className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-amber-500/20">
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                      <Edit3 className="w-4 h-4 text-amber-500" />
                      إجراء تصحيح إداري رسمي على إقفال معتمد
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsCorrecting(false)}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      إلغاء
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        النقد المصحح *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={corrCash}
                        onChange={(e) => setCorrCash(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#070e17] border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        الشبكة المصححة *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={corrCard}
                        onChange={(e) => setCorrCard(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#070e17] border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        المشتريات المصححة *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={corrExpenses}
                        onChange={(e) => setCorrExpenses(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#070e17] border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* New Totals Calculated */}
                  <div className="p-3 rounded-xl bg-white dark:bg-[#0c1829] border border-amber-500/20 text-xs font-mono space-y-1">
                    <div className="flex justify-between">
                      <span className="font-sans text-slate-400">إجمالي المبيعات الجديد:</span>
                      <span className="font-bold text-amber-500">
                        {formatCurrency(corrCalc.totalSales, currentOrg?.currency || 'SAR', language)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-sans text-slate-400">باقي الصندوق الجديد:</span>
                      <span className="font-bold text-sky-400">
                        {formatCurrency(corrCalc.remainingInBox, currentOrg?.currency || 'SAR', language)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-sans text-slate-400">صافي الفترة الجديد:</span>
                      <span className="font-bold text-amber-400">
                        {formatCurrency(corrCalc.netPeriod, currentOrg?.currency || 'SAR', language)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-amber-700 dark:text-amber-300 mb-1">
                      مبرر وسبب التصحيح الإداري (إلزامي للرقابة) *
                    </label>
                    <textarea
                      rows={2}
                      required
                      value={corrReason}
                      onChange={(e) => setCorrReason(e.target.value)}
                      placeholder="مثال: تصحيح فروقات شبكة جهاز مدى بعد مراجعة تقرير البنك اليومي..."
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#070e17] border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={reviewLoading}
                      className="px-5 py-2.5 rounded-xl font-bold text-xs text-slate-950 bg-amber-400 hover:bg-amber-300 disabled:opacity-50"
                    >
                      {reviewLoading ? 'جاري توثيق التصحيح...' : 'حفظ التصحيح الإداري وتوثيقه'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCorrecting(false)}
                      className="px-4 py-2.5 rounded-xl font-medium text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
                    >
                      إلغاء
                    </button>
                  </div>
                </form>
              ) : (
                /* Standard Math Figures Grid */
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#070e17] border border-slate-200 dark:border-slate-800">
                    <span className="text-[11px] font-sans text-slate-500 block">مبيعات النقد (كاش)</span>
                    <span className="text-base font-bold text-amber-500">
                      {formatCurrency(activeClosing.cashSales, currentOrg?.currency || 'SAR', language)}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#070e17] border border-slate-200 dark:border-slate-800">
                    <span className="text-[11px] font-sans text-slate-500 block">مبيعات الشبكة (مدى)</span>
                    <span className="text-base font-bold text-sky-400">
                      {formatCurrency(activeClosing.cardSales, currentOrg?.currency || 'SAR', language)}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#070e17] border border-slate-200 dark:border-slate-800">
                    <span className="text-[11px] font-sans text-slate-500 block">المشتريات والمصروفات</span>
                    <span className="text-base font-bold text-rose-400">
                      {formatCurrency(activeClosing.expenses, currentOrg?.currency || 'SAR', language)}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <span className="text-[11px] font-sans text-amber-700 dark:text-amber-300 font-bold block">
                      إجمالي المبيعات (نقد + شبكة)
                    </span>
                    <span className="text-base font-extrabold text-slate-900 dark:text-white">
                      {formatCurrency(activeClosing.totalSales, currentOrg?.currency || 'SAR', language)}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20">
                    <span className="text-[11px] font-sans text-sky-700 dark:text-sky-300 font-bold block">
                      الباقي بالصندوق (نقد - مشتريات)
                    </span>
                    <span className="text-base font-extrabold text-slate-900 dark:text-white">
                      {formatCurrency(activeClosing.remainingInBox, currentOrg?.currency || 'SAR', language)}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30">
                    <span className="text-[11px] font-sans text-amber-600 dark:text-amber-400 font-bold block">
                      صافي الفترة (مبيعات - مشتريات)
                    </span>
                    <span className="text-base font-extrabold text-slate-900 dark:text-white">
                      {formatCurrency(activeClosing.netPeriod, currentOrg?.currency || 'SAR', language)}
                    </span>
                  </div>
                </div>
              )}

              {/* Cashier Notes */}
              {activeClosing.notes && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#070e17] border border-slate-200 dark:border-slate-800 text-xs">
                  <span className="text-slate-400 block mb-1 font-semibold">ملاحظات مسجل الإقفال:</span>
                  <p className="text-slate-700 dark:text-slate-200">{activeClosing.notes}</p>
                </div>
              )}

              {/* Rejection Input Section */}
              {isRejecting && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-3">
                  <label className="block text-xs font-bold text-rose-600 dark:text-rose-400">
                    سبب إرجاع الإقفال للموظف (مطلوب) *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="مثال: يرجى مراجعة إيصال مصروفات البنزين، المبلغ غير متطابق..."
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#070e17] border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:border-rose-500"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleReject}
                      disabled={reviewLoading}
                      className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 transition-colors disabled:opacity-50"
                    >
                      {reviewLoading ? 'جاري الإرجاع...' : 'تأكيد الإرجاع للموظف'}
                    </button>
                    <button
                      onClick={() => setIsRejecting(false)}
                      className="px-3 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons ONLY for Pending Review Closings (Matches firestore.rules auditLogs requirement) */}
              {activeClosing.status === 'pending_review' && !isRejecting && !isCorrecting && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                  <button
                    onClick={() => setIsRejecting(true)}
                    disabled={reviewLoading}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 border border-rose-500/30 transition-colors flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>إعادة للتعديل</span>
                  </button>

                  <button
                    onClick={handleApprove}
                    disabled={reviewLoading}
                    className="px-6 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4 text-slate-950" />
                    <span>{reviewLoading ? 'جاري الاعتماد...' : 'اعتماد الإقفال رسمياً'}</span>
                  </button>
                </div>
              )}

              {(activeClosing.status === 'draft' || activeClosing.status === 'rejected') && (
                <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/70 border border-slate-300 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>
                    {activeClosing.status === 'draft'
                      ? 'هذا الإقفال ما زال مسودة لدى الموظف ولم يُرفع للمراجعة بعد؛ لذلك لا يمكن اعتماده أو إرجاعه قبل إرساله للاعتماد.'
                      : 'هذا الإقفال مُعاد حالياً للموظف للتعديل؛ وبانتظار إعادة إرساله للمراجعة قبل التمكن من اعتماده.'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
