import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { ShieldCheck, History, User, Clock, FileText } from 'lucide-react';

export const AuditLogsView: React.FC = () => {
  const { auditLogs, currentOrg } = useAuth();
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <History className="w-5 h-5 text-amber-500" />
          <span>سجل العمليات والرقابة الإدارية ({auditLogs.length} عملية موثقة)</span>
        </h3>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          سجل غير قابل للتعديل يوثق جميع اعتمادات الإقفالات، وإرجاع الورديات، وتغييرات الفروع والموظفين
        </span>
      </div>

      {/* Logs View: Mobile Cards (< 768px) */}
      <div className="block md:hidden space-y-3">
        {auditLogs.map((log) => {
          const actionLabels: Record<string, { label: string; color: string }> = {
            CLOSING_APPROVED: { label: 'اعتماد إقفال', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
            CLOSING_REJECTED_FOR_REVISION: { label: 'إرجاع للتعديل', color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
            CLOSING_SUBMITTED_FOR_REVIEW: { label: 'إرسال إقفال', color: 'text-sky-400 bg-sky-500/10 border-sky-500/20' },
            CLOSING_DRAFT_SAVED: { label: 'حفظ مسودة', color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' },
            BRANCH_CREATED: { label: 'إنشاء فرع', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
            EMPLOYEE_PROVISIONED: { label: 'إنشاء موظف', color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
            EMPLOYEE_ACTIVATED: { label: 'تنشيط موظف', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
            EMPLOYEE_DISABLED: { label: 'تعطيل موظف', color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
            ORGANIZATION_ESTABLISHED: { label: 'تأسيس مؤسسة', color: 'text-amber-300 bg-amber-500/15 border-amber-500/30' },
          };

          const act = actionLabels[log.action] || {
            label: log.action,
            color: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
          };

          return (
            <div
              key={log.id}
              className="p-4 rounded-2xl bg-white dark:bg-[#0c1829] border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${act.color}`}>
                  {act.label}
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  {new Date(log.timestamp).toLocaleString('ar-SA')}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-bold text-slate-900 dark:text-white">{log.actorName}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                  {log.actorRole === 'manager' ? 'المدير' : 'موظف'}
                </span>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-[#070e17] p-2.5 rounded-xl border border-slate-200 dark:border-slate-800/60 leading-relaxed">
                {log.details}
              </p>
            </div>
          );
        })}

        {auditLogs.length === 0 && (
          <div className="py-12 text-center text-xs text-slate-400 bg-white dark:bg-[#0c1829] rounded-2xl border border-slate-200 dark:border-slate-800">
            لا توجد عمليات مسجلة في سجل الرقابة حتى الآن.
          </div>
        )}
      </div>

      {/* Logs Table: Desktop (>= 768px) */}
      <div className="hidden md:block bg-white dark:bg-[#0c1829] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs sm:text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-4 text-start">الوقت والتاريخ</th>
                <th className="p-4 text-start">المنفذ</th>
                <th className="p-4 text-start">نوع العملية</th>
                <th className="p-4 text-start">التفاصيل والتأثير</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              {auditLogs.map((log) => {
                const actionLabels: Record<string, { label: string; color: string }> = {
                  CLOSING_APPROVED: { label: 'اعتماد إقفال', color: 'text-amber-500 bg-amber-500/10' },
                  CLOSING_REJECTED_FOR_REVISION: { label: 'إرجاع للتعديل', color: 'text-rose-400 bg-rose-500/10' },
                  CLOSING_SUBMITTED_FOR_REVIEW: { label: 'إرسال إقفال', color: 'text-sky-400 bg-sky-500/10' },
                  CLOSING_DRAFT_SAVED: { label: 'حفظ مسودة', color: 'text-slate-400 bg-slate-500/10' },
                  BRANCH_CREATED: { label: 'إنشاء فرع', color: 'text-amber-400 bg-amber-500/10' },
                  EMPLOYEE_PROVISIONED: { label: 'إنشاء موظف', color: 'text-indigo-400 bg-indigo-500/10' },
                  EMPLOYEE_ACTIVATED: { label: 'تنشيط موظف', color: 'text-amber-400 bg-amber-500/10' },
                  EMPLOYEE_DISABLED: { label: 'تعطيل موظف', color: 'text-rose-400 bg-rose-500/10' },
                  ORGANIZATION_ESTABLISHED: { label: 'تأسيس مؤسسة', color: 'text-amber-300 bg-amber-500/15' },
                };

                const act = actionLabels[log.action] || {
                  label: log.action,
                  color: 'text-slate-400 bg-slate-500/10',
                };

                return (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="p-4 font-sans text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('ar-SA')}
                    </td>
                    <td className="p-4 font-sans font-semibold text-slate-900 dark:text-white">
                      <div>{log.actorName}</div>
                      <div className="text-[10px] text-slate-400 font-normal">
                        {log.actorRole === 'manager' ? 'المدير' : 'موظف'}
                      </div>
                    </td>
                    <td className="p-4 font-sans">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${act.color}`}>
                        {act.label}
                      </span>
                    </td>
                    <td className="p-4 font-sans text-xs text-slate-700 dark:text-slate-300">
                      {log.details}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {auditLogs.length === 0 && (
            <div className="py-12 text-center text-xs text-slate-400">
              لا توجد عمليات مسجلة في سجل الرقابة حتى الآن.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
