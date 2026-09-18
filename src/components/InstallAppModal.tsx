import React, { useState } from 'react';
import { Smartphone, Download, ExternalLink, Check, Copy, X, Sparkles, Shield, QrCode } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'instant' | 'apk' | 'qr'>('instant');

  if (!isOpen) return null;

  // Use current URL origin or deployment URL
  const appUrl = typeof window !== 'undefined' 
    ? (window.location.origin.includes('localhost') 
        ? 'https://ais-pre-csspiikdwrfzzbsjfkcwr5-714229878541.asia-southeast1.run.app'
        : window.location.origin)
    : 'https://ais-pre-csspiikdwrfzzbsjfkcwr5-714229878541.asia-southeast1.run.app';

  const pwabuilderUrl = `https://www.pwabuilder.com/publish?site=${encodeURIComponent(appUrl)}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(appUrl)}&color=4338ca&bgcolor=ffffff&margin=10`;

  const handleCopy = () => {
    navigator.clipboard.writeText(appUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDirectInstall = async () => {
    if (isInstallable) {
      await install();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div 
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with App Banner */}
        <div className="relative bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 text-white">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-4">
            <div className="size-14 rounded-2xl bg-white p-2.5 shadow-lg flex items-center justify-center shrink-0">
              <img src="/icon.svg" alt="App Icon" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black tracking-tight">AI Resume Builder</h3>
                <span className="text-[10px] uppercase tracking-wider font-extrabold bg-amber-400 text-amber-950 px-2 py-0.5 rounded-full">
                  Android & Web
                </span>
              </div>
              <p className="text-xs text-indigo-100 mt-1">
                Install as a native app or download an APK for your mobile device
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-2 mt-5 p-1 bg-indigo-950/40 rounded-xl">
            <button
              onClick={() => setActiveTab('instant')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'instant' ? 'bg-white text-indigo-900 shadow-sm' : 'text-indigo-200 hover:text-white'
              }`}
            >
              <Smartphone size={14} />
              Install App
            </button>
            <button
              onClick={() => setActiveTab('apk')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'apk' ? 'bg-white text-indigo-900 shadow-sm' : 'text-indigo-200 hover:text-white'
              }`}
            >
              <Download size={14} />
              Get .APK File
            </button>
            <button
              onClick={() => setActiveTab('qr')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'qr' ? 'bg-white text-indigo-900 shadow-sm' : 'text-indigo-200 hover:text-white'
              }`}
            >
              <QrCode size={14} />
              QR Scan
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* TAB 1: Instant Install (PWA / WebAPK) */}
          {activeTab === 'instant' && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-2xl flex items-start gap-3">
                <div className="p-2 rounded-xl bg-emerald-500 text-white shrink-0">
                  <Shield size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-300">
                    Direct Android WebAPK (Recommended)
                  </h4>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1 leading-relaxed">
                    Android automatically generates and signs an official <strong>WebAPK</strong> when you tap install. No sideloading or file transfer required!
                  </p>
                </div>
              </div>

              {isInstallable ? (
                <button
                  onClick={handleDirectInstall}
                  className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 transition-all text-sm"
                >
                  <Download size={20} />
                  Install App Now on this Device
                </button>
              ) : isInstalled ? (
                <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl text-center text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Application is already installed in Standalone mode!
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    How to install on Android in 2 taps:
                  </div>
                  <ol className="space-y-2 text-xs text-slate-600 dark:text-slate-300 font-medium">
                    <li className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                      <span className="size-5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-[10px]">1</span>
                      Open this app in <strong>Google Chrome</strong> on your Android phone.
                    </li>
                    <li className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                      <span className="size-5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-[10px]">2</span>
                      Tap the <strong>three dots (⋮)</strong> menu at the top right of Chrome.
                    </li>
                    <li className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                      <span className="size-5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-[10px]">3</span>
                      Select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.
                    </li>
                  </ol>
                </div>
              )}

              {isIOS && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs text-slate-600 dark:text-slate-300">
                  <strong>iOS Safari:</strong> Tap the <strong>Share</strong> button, then select <strong>"Add to Home Screen"</strong>.
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Standalone .APK File Generator */}
          {activeTab === 'apk' && (
            <div className="space-y-4">
              <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/40 rounded-2xl">
                <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200 font-bold text-sm mb-1">
                  <Sparkles size={16} className="text-indigo-600 dark:text-indigo-400" />
                  Instant Standalone APK Packaging
                </div>
                <p className="text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed">
                  Our Web App Manifest is 100% compliant. You can instantly generate and download a compiled standalone <strong>.apk</strong> or <strong>.aab</strong> (Google Play) package using Microsoft PWABuilder.
                </p>
              </div>

              <a
                href={pwabuilderUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 transition-all text-sm"
              >
                <Download size={18} />
                Generate .APK on PWABuilder
                <ExternalLink size={16} />
              </a>

              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Steps on PWABuilder:
                </span>
                <ol className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 list-decimal list-inside">
                  <li>Click the button above to open the pre-configured project.</li>
                  <li>Click <strong>"Package for Android"</strong>.</li>
                  <li>Click <strong>"Download Package"</strong> to receive your signed <code className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono text-[11px]">.apk</code> file!</li>
                </ol>
              </div>

              {/* Advanced Bubblewrap CLI info */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Developer Command (Bubblewrap CLI)
                </div>
                <code className="block text-[11px] font-mono text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-700 break-all select-all">
                  npx @bubblewrap/cli init --manifest={appUrl}/manifest.webmanifest
                </code>
              </div>
            </div>
          )}

          {/* TAB 3: QR Code & Direct Link */}
          {activeTab === 'qr' && (
            <div className="space-y-4 text-center">
              <div className="flex flex-col items-center justify-center p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 w-fit mx-auto shadow-sm">
                <img 
                  src={qrCodeUrl} 
                  alt="App Mobile QR Code" 
                  className="size-48 object-contain rounded-lg"
                />
                <span className="text-[11px] text-slate-400 font-medium mt-2">
                  Scan with your phone's camera
                </span>
              </div>

              <div className="space-y-2 text-left">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                  Direct Mobile Link
                </label>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={appUrl}
                    className="flex-1 h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-600 dark:text-slate-300 outline-none"
                  />
                  <button
                    onClick={handleCopy}
                    className="h-11 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shrink-0 shadow-sm"
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs text-slate-500">
          <span>PWA & WebAPK compliant</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
