import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, QrCode, ShieldAlert, CheckCircle, Upload, AlertTriangle, ExternalLink, RefreshCw } from 'lucide-react';
import jsQR from 'jsqr';
import { UPIDetails } from '../types';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({ isOpen, onClose }) => {
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [upiData, setUpiData] = useState<UPIDetails | null>(null);
  const [genericText, setGenericText] = useState<string | null>(null);
  const [confirmedSafety, setConfirmedSafety] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setUpiData(null);
      setGenericText(null);
      setConfirmedSafety(false);
      setCameraError(null);
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      setHasCameraPermission(true);
      setIsScanning(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.play();
        requestAnimationFrame(tickScan);
      }
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setHasCameraPermission(false);
      setCameraError('Camera start nahi ho saka. Browser me camera permission allow karein ya neeche se photo upload karein.');
    }
  };

  const stopCamera = () => {
    setIsScanning(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const parseUPI = (text: string): UPIDetails | null => {
    try {
      if (text.startsWith('upi://pay')) {
        const url = new URL(text);
        const pa = url.searchParams.get('pa') || '';
        const pn = url.searchParams.get('pn') || '';
        const am = url.searchParams.get('am') || '';
        const tn = url.searchParams.get('tn') || '';
        const tr = url.searchParams.get('tr') || '';

        return {
          raw: text,
          payeeVpa: pa,
          payeeName: decodeURIComponent(pn),
          amount: am,
          note: decodeURIComponent(tn),
          transactionRef: tr,
        };
      }
    } catch (e) {
      console.warn('UPI Parse error', e);
    }
    return null;
  };

  const tickScan = () => {
    if (!videoRef.current || !canvasRef.current || !isScanning) return;

    if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.height = videoRef.current.videoHeight;
        canvas.width = videoRef.current.videoWidth;
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (code && code.data) {
          const parsed = parseUPI(code.data);
          if (parsed) {
            setUpiData(parsed);
            if (parsed.amount) setCustomAmount(parsed.amount);
          } else {
            setGenericText(code.data);
          }
          stopCamera();
          return;
        }
      }
    }
    animationFrameRef.current = requestAnimationFrame(tickScan);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);

          if (code && code.data) {
            const parsed = parseUPI(code.data);
            if (parsed) {
              setUpiData(parsed);
              if (parsed.amount) setCustomAmount(parsed.amount);
            } else {
              setGenericText(code.data);
            }
            stopCamera();
          } else {
            alert('Is photo me koi QR code nahi mila.');
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleOpenUPIApp = (appScheme: string) => {
    if (!upiData) return;
    const finalAmount = customAmount || upiData.amount || '0';
    let baseUri = upiData.raw;

    if (!baseUri.includes('am=') && customAmount) {
      baseUri += `&am=${encodeURIComponent(finalAmount)}`;
    }

    if (appScheme === 'gpay') {
      window.location.href = baseUri.replace('upi://pay', 'gpay://upi/pay');
    } else if (appScheme === 'phonepe') {
      window.location.href = baseUri.replace('upi://pay', 'phonepe://pay');
    } else if (appScheme === 'paytm') {
      window.location.href = baseUri.replace('upi://pay', 'paytmmp://pay');
    } else {
      window.location.href = baseUri;
    }

    setTimeout(() => {
      window.location.href = baseUri;
    }, 400);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-indigo-500/30 rounded-2xl p-5 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 flex items-center justify-center">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-1.5">
                <span>QR Code & Payment Scanner</span>
              </h3>
              <p className="text-xs text-slate-400">
                Payment karne se pehle hamesha explicit confirmation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera viewport */}
        {!upiData && !genericText ? (
          <div className="mt-4 space-y-3">
            <div className="relative aspect-square w-full bg-black rounded-xl overflow-hidden border border-slate-700 flex items-center justify-center">
              {hasCameraPermission === false ? (
                <div className="p-4 text-center text-xs text-rose-300">
                  <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
                  <p>{cameraError || 'Camera permission denied'}</p>
                </div>
              ) : (
                <>
                  <video ref={videoRef} className="w-full h-full object-cover" />
                  <canvas ref={canvasRef} className="hidden" />

                  {/* Aim frame */}
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="w-48 h-48 border-2 border-indigo-400 border-dashed rounded-2xl animate-pulse" />
                  </div>
                </>
              )}
            </div>

            {/* Photo upload fallback */}
            <div className="flex items-center justify-between pt-1">
              <label className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>Gallery se QR Image Chunein</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        ) : upiData ? (
          /* Scanned UPI details */
          <div className="mt-4 space-y-4 animate-in fade-in">
            <div className="p-3.5 rounded-xl bg-slate-950 border border-indigo-500/40 space-y-2 text-xs">
              <div className="font-bold text-sm text-white flex items-center justify-between">
                <span>{upiData.payeeName || 'Merchant / VPA'}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                  UPI QR Verified
                </span>
              </div>
              <div className="text-slate-400 font-mono text-[11px]">{upiData.payeeVpa}</div>

              <div>
                <label className="text-slate-400 block mb-1">Amount (Rupees ₹)</label>
                <input
                  type="number"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder="Enter amount ₹"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono text-sm focus:outline-none focus:border-indigo-400"
                />
              </div>

              {upiData.note && (
                <div className="text-slate-400 italic">Note: "{upiData.note}"</div>
              )}
            </div>

            {/* Crucial confirmation checkbox */}
            <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 text-xs text-amber-200 space-y-2">
              <div className="font-bold flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                Payment Safety Confirmation:
              </div>
              <p className="text-[11px] leading-relaxed text-amber-300/90">
                Paisa bhejne se pehle payee ka naam check kar lein. J. A. R. V. I. S. kabhi apna UPI PIN nahi mangta.
              </p>
              <label className="flex items-center gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmedSafety}
                  onChange={(e) => setConfirmedSafety(e.target.checked)}
                  className="rounded accent-amber-500 w-4 h-4"
                />
                <span className="text-xs font-semibold text-white">
                  Maine payee check kar liya hai, payment app kholein
                </span>
              </label>
            </div>

            {/* UPI App Launch Buttons */}
            {confirmedSafety && (
              <div className="space-y-2 pt-1 animate-in fade-in">
                <div className="text-xs text-slate-400">Apna UPI App Chunein:</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    onClick={() => handleOpenUPIApp('gpay')}
                    className="p-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl border border-slate-700 font-semibold"
                  >
                    Google Pay (GPay)
                  </button>
                  <button
                    onClick={() => handleOpenUPIApp('phonepe')}
                    className="p-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl border border-slate-700 font-semibold"
                  >
                    PhonePe
                  </button>
                  <button
                    onClick={() => handleOpenUPIApp('paytm')}
                    className="p-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl border border-slate-700 font-semibold"
                  >
                    Paytm
                  </button>
                  <button
                    onClick={() => handleOpenUPIApp('default')}
                    className="p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold"
                  >
                    Any UPI App
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Generic QR text */
          <div className="mt-4 p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-2">
            <div className="font-semibold text-white">QR Code Content:</div>
            <div className="p-2 bg-slate-900 rounded font-mono text-[11px] text-cyan-300 break-all">
              {genericText}
            </div>
            {genericText && genericText.startsWith('http') && (
              <a
                href={genericText}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-cyan-400 hover:underline"
              >
                URL Open Karein <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
