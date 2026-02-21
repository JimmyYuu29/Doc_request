'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import api from '@/lib/api';
import { formatDate, getStatusBadgeClass, getStatusLabel, formatFileSize, getEvidenceTypeLabel } from '@/lib/utils';
import {
  FileText, Upload, CheckCircle, AlertCircle, Clock, KeyRound,
  Loader2, X,
} from 'lucide-react';

interface EvidenceItem {
  evidence_id: string;
  name: string;
  type: string;
  is_mandatory: boolean;
  instructions: string | null;
  status: string;
}

interface PortalData {
  request: {
    request_id: string;
    recipient_name: string;
    deadline: string;
    status: string;
    campaign: { name: string; control_code: string };
    evidences: EvidenceItem[];
  };
  requires_otp: boolean;
}

interface SelectedFile {
  evidence_id: string;
  file: File;
}

export default function SubmitPortalPage() {
  const params = useParams();
  const [portalData, setPortalData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // OTP state
  const [otpRequired, setOtpRequired] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);

  // Upload state
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Active evidence for file selection
  const [activeEvidenceId, setActiveEvidenceId] = useState<string | null>(null);

  useEffect(() => {
    fetchPortal();
  }, [params.token]);

  const fetchPortal = async () => {
    try {
      const { data } = await api.get(`/submit/${params.token}`);
      setPortalData(data);
      if (data.requires_otp) {
        setOtpRequired(true);
      } else {
        setOtpVerified(true);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Enlace invalido o expirado');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpLoading(true);
    setOtpError('');

    try {
      await api.post(`/submit/${params.token}/verify-otp`, { code: otpCode });
      setOtpVerified(true);
    } catch (err: any) {
      setOtpError(err.response?.data?.error || 'Codigo invalido');
    } finally {
      setOtpLoading(false);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (!activeEvidenceId) return;
    const newFiles = acceptedFiles.map((file) => ({
      evidence_id: activeEvidenceId,
      file,
    }));
    setSelectedFiles((prev) => [...prev, ...newFiles]);
    setActiveEvidenceId(null);
  }, [activeEvidenceId]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: 100 * 1024 * 1024,
    noClick: !activeEvidenceId,
    noDrag: !activeEvidenceId,
  });

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    setUploading(true);

    try {
      const formData = new FormData();
      const evidenceIds: string[] = [];

      selectedFiles.forEach((sf) => {
        formData.append('files', sf.file);
        evidenceIds.push(sf.evidence_id);
      });

      formData.append('evidence_ids', JSON.stringify(evidenceIds));
      if (notes) formData.append('notes', notes);

      await api.post(`/submit/${params.token}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setUploadSuccess(true);
      setSelectedFiles([]);
      setNotes('');
      fetchPortal(); // Refresh status
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al enviar documentacion');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error && !portalData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="card max-w-md text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Acceso no disponible</h1>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!portalData) return null;
  const { request } = portalData;

  // OTP screen
  if (otpRequired && !otpVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="card max-w-sm w-full">
          <div className="text-center mb-6">
            <div className="mx-auto h-12 w-12 rounded-xl bg-primary-100 flex items-center justify-center mb-4">
              <KeyRound className="h-6 w-6 text-primary-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Verificacion de identidad</h1>
            <p className="text-sm text-gray-500 mt-1">
              Hemos enviado un codigo de 6 digitos a su correo electronico.
            </p>
          </div>

          <form onSubmit={handleVerifyOtp} className="space-y-4">
            {otpError && (
              <div className="p-3 bg-red-50 rounded-lg text-sm text-red-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {otpError}
              </div>
            )}

            <div>
              <label className="label">Codigo de verificacion</label>
              <input
                type="text"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="input text-center text-2xl tracking-widest font-mono"
                placeholder="000000"
                maxLength={6}
                required
              />
              <p className="text-xs text-gray-400 mt-1">Valido durante 10 minutos. Maximo 3 intentos.</p>
            </div>

            <button type="submit" disabled={otpLoading || otpCode.length !== 6} className="btn-primary w-full">
              {otpLoading ? 'Verificando...' : 'Verificar'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Upload portal
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Portal Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-primary-600" />
            <span className="font-semibold text-gray-900">Peticion de Documentacion</span>
          </div>
          <span className="text-sm text-gray-500">{request.campaign.control_code}</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* Success message */}
        {uploadSuccess && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <p className="text-green-800 text-sm font-medium">
              Documentacion enviada correctamente. Sera revisada por el responsable del control.
            </p>
          </div>
        )}

        {/* Welcome */}
        <div className="card">
          <h1 className="text-xl font-bold text-gray-900">
            Hola, {request.recipient_name}
          </h1>
          <p className="text-sm text-gray-600 mt-2">
            Se le solicita la siguiente documentacion para la campana <strong>{request.campaign.name}</strong>.
          </p>
          <div className="mt-3 flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1 text-gray-500">
              <Clock className="h-4 w-4" /> Fecha limite: <strong>{formatDate(request.deadline)}</strong>
            </span>
            <span className={`badge ${getStatusBadgeClass(request.status)}`}>
              {getStatusLabel(request.status)}
            </span>
          </div>
        </div>

        {/* Evidence List */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">Documentacion solicitada</h2>

          {request.evidences.map((ev) => {
            const filesForEvidence = selectedFiles.filter((sf) => sf.evidence_id === ev.evidence_id);

            return (
              <div key={ev.evidence_id} className="card">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900">{ev.name}</h3>
                      <span className={`badge ${getStatusBadgeClass(ev.status)}`}>
                        {getStatusLabel(ev.status)}
                      </span>
                      {ev.is_mandatory && <span className="text-xs text-red-500">Obligatorio</span>}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Tipo: {getEvidenceTypeLabel(ev.type)}
                    </p>
                    {ev.instructions && (
                      <p className="text-sm text-gray-600 mt-1">{ev.instructions}</p>
                    )}
                  </div>
                </div>

                {/* Upload area for PENDING evidence */}
                {(ev.status === 'PENDING' || ev.status === 'REJECTED') && (
                  <div className="mt-3">
                    {filesForEvidence.length > 0 ? (
                      <div className="space-y-2">
                        {filesForEvidence.map((sf, idx) => {
                          const globalIdx = selectedFiles.indexOf(sf);
                          return (
                            <div key={idx} className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg text-sm">
                              <FileText className="h-4 w-4 text-blue-600" />
                              <span className="flex-1">{sf.file.name}</span>
                              <span className="text-gray-400">{formatFileSize(sf.file.size)}</span>
                              <button onClick={() => removeFile(globalIdx)} className="text-red-500 hover:text-red-700">
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div
                        {...(activeEvidenceId === ev.evidence_id ? getRootProps() : {})}
                        onClick={() => {
                          setActiveEvidenceId(ev.evidence_id);
                          document.getElementById(`file-input-${ev.evidence_id}`)?.click();
                        }}
                        className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                          activeEvidenceId === ev.evidence_id && isDragActive
                            ? 'border-primary-400 bg-primary-50'
                            : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          {...(activeEvidenceId === ev.evidence_id ? getInputProps() : {})}
                          id={`file-input-${ev.evidence_id}`}
                          type="file"
                          className="hidden"
                          onChange={(e) => {
                            const files = e.target.files;
                            if (files) {
                              const newFiles = Array.from(files).map((file) => ({
                                evidence_id: ev.evidence_id,
                                file,
                              }));
                              setSelectedFiles((prev) => [...prev, ...newFiles]);
                            }
                          }}
                        />
                        <Upload className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">
                          Haga clic para seleccionar un archivo
                        </p>
                        <p className="text-xs text-gray-400 mt-1">Maximo 100 MB</p>
                      </div>
                    )}
                  </div>
                )}

                {ev.status === 'VALIDATED' && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    Evidencia validada
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Notes & Submit */}
        {selectedFiles.length > 0 && (
          <div className="card space-y-4">
            <div>
              <label className="label">Notas adicionales (opcional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="input"
                rows={3}
                placeholder="Anade cualquier aclaracion sobre la documentacion enviada..."
              />
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {selectedFiles.length} archivo(s) seleccionado(s)
              </p>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="btn-primary"
              >
                {uploading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando...</>
                ) : (
                  <><Upload className="h-4 w-4 mr-2" /> Enviar Documentacion</>
                )}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
