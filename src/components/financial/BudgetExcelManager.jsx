import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, Upload, FolderOpen, Loader2, Clock, FileText } from "lucide-react";
import { toast } from "sonner";

export default function BudgetExcelManager({ budget, onImportSuccess }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [showDriveDialog, setShowDriveDialog] = useState(false);
  const [driveFiles, setDriveFiles] = useState([]);
  const [loadingDriveFiles, setLoadingDriveFiles] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [importingFile, setImportingFile] = useState(false);

  // Descargar como Excel
  const handleDownloadExcel = async () => {
    if (!budget?.id) {
      toast.error("Selecciona un presupuesto primero");
      return;
    }

    setIsDownloading(true);
    try {
      const { data } = await base44.functions.invoke('downloadBudgetExcel', {
        budgetId: budget.id
      });

      if (data?.file_base64) {
        // Convertir base64 a blob y descargar
        const binaryString = atob(data.file_base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], {
          type: 'text/csv'
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = data.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.success('✅ Excel descargado. Súbelo a Google Drive para editar.');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al descargar Excel');
    } finally {
      setIsDownloading(false);
    }
  };

  // Listar archivos de Drive
  const handleOpenDrive = async () => {
    setShowDriveDialog(true);
    setLoadingDriveFiles(true);
    try {
      const { data } = await base44.functions.invoke('listDriveBudgetFiles', {});

      if (data?.error && data.needsAuth) {
        toast.error('Google Drive no está autorizado. Autoriza desde el panel de configuración.');
        setShowDriveDialog(false);
        return;
      }

      if (data?.files?.length > 0) {
        setDriveFiles(data.files);
      } else {
        toast.info('No hay archivos Excel en Drive. Descarga uno y súbelo primero.');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al acceder a Google Drive');
      setShowDriveDialog(false);
    } finally {
      setLoadingDriveFiles(false);
    }
  };

  // Importar desde Drive
  const handleImportFromDrive = async (fileId) => {
    if (!budget?.id) {
      toast.error("Selecciona un presupuesto primero");
      return;
    }

    setImportingFile(true);
    try {
      const { data } = await base44.functions.invoke('importBudgetFromDrive', {
        fileId,
        budgetId: budget.id
      });

      if (data?.success) {
        toast.success(`✅ ${data.message}`);
        setShowDriveDialog(false);
        setDriveFiles([]);
        onImportSuccess?.();
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al importar desde Drive');
    } finally {
      setImportingFile(false);
    }
  };

  return (
    <>
      {/* Sección de Excel en Drive */}
      <Card className="border-2 border-dashed border-orange-300 bg-gradient-to-br from-orange-50 to-amber-50 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-orange-600 to-amber-600 text-white">
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5" />
            Gestión Excel en Google Drive
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="bg-white rounded-lg p-4 border border-orange-200">
            <p className="text-sm text-slate-700 mb-4">
              <strong>Flujo:</strong> Descarga el presupuesto como Excel → Sube a Google Drive → Edita con tu equipo → Importa los cambios
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Botón Descargar */}
              <button
                onClick={handleDownloadExcel}
                disabled={isDownloading || !budget?.id}
                className="group relative p-4 rounded-xl bg-gradient-to-br from-green-600 to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex flex-col items-center gap-2">
                  {isDownloading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Download className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  )}
                  <span className="font-bold text-sm">
                    {isDownloading ? 'Descargando...' : 'Descargar Excel'}
                  </span>
                  <span className="text-xs text-green-100">Guarda y sube a Drive</span>
                </div>
              </button>

              {/* Botón Drive */}
              <button
                onClick={handleOpenDrive}
                disabled={loadingDriveFiles}
                className="group relative p-4 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-700 text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex flex-col items-center gap-2">
                  {loadingDriveFiles ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <FolderOpen className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  )}
                  <span className="font-bold text-sm">
                    {loadingDriveFiles ? 'Cargando...' : 'Ver Drive'}
                  </span>
                  <span className="text-xs text-blue-100">Lista archivos Excel</span>
                </div>
              </button>

              {/* Botón Importar Manual */}
              <label className="group relative p-4 rounded-xl bg-gradient-to-br from-purple-600 to-pink-700 text-white shadow-lg hover:shadow-xl transition-all cursor-pointer">
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span className="font-bold text-sm">Importar Local</span>
                  <span className="text-xs text-purple-100">Sube archivo Excel</span>
                </div>
                <input 
                  type="file" 
                  accept=".xlsx,.xls"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file || !budget?.id) return;
                    // Aquí puedes agregar lógica para importar archivo local
                    toast.info('Característica próximamente disponible');
                  }}
                  className="hidden"
                />
              </label>
            </div>

            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-900">
                💡 <strong>Tip:</strong> Los archivos Excel en Drive se pueden editar con tu equipo en tiempo real usando Google Sheets.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog: Seleccionar archivo de Drive */}
      <Dialog open={showDriveDialog} onOpenChange={setShowDriveDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-blue-600" />
              Archivos Excel en Google Drive
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {loadingDriveFiles ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                <span className="ml-2 text-slate-600">Cargando archivos...</span>
              </div>
            ) : driveFiles.length === 0 ? (
              <div className="text-center py-8 text-slate-600">
                <FileText className="w-12 h-12 mx-auto opacity-30 mb-2" />
                <p>No se encontraron archivos Excel</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {driveFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">{file.name}</p>
                      <div className="flex gap-2 mt-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(file.modified).toLocaleString('es-ES')}
                        </span>
                        <span>
                          {file.size ? `${(file.size / 1024).toFixed(1)} KB` : '-'}
                        </span>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleImportFromDrive(file.id)}
                      disabled={importingFile}
                      className="ml-3 bg-blue-600 hover:bg-blue-700"
                    >
                      {importingFile ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Importar
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}