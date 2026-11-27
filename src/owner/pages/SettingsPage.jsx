import { Printer } from "lucide-react";
import InvoiceTemplateSettings from "../components/settings/InvoiceTemplateSettings";

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-slate-50/60 p-4 sm:p-5 font-sans">
      <div className="max-w-[1500px] mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-md shadow-indigo-600/20">
              <Printer size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  Print &amp; Invoice Templates
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60 rounded-full">
                  Settings
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Choose the active invoice template for on-screen viewing, printing, and PDF exports.
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <InvoiceTemplateSettings />
      </div>
    </div>
  );
}
