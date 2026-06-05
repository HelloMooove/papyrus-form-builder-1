'use client';

import { useState, useContext } from 'react';
import { Upload, CheckCircle } from 'lucide-react';
import { FieldContext } from '../../public/PublicFieldCard';

export interface FileUploadFieldProps {
  type: 'image' | 'video' | 'file';
  enabled: boolean;
  required?: boolean;
  preview: boolean;
  value?: File | string | null;
  onChange?: (file: File | null) => void;
  accept?: string;
  maxSize?: number;
}

export function FileUploadField({
  type,
  enabled,
  required,
  preview,
  value,
  onChange,
  accept,
  maxSize
}: FileUploadFieldProps) {
  const contextField = useContext(FieldContext);
  const [localFile, setLocalFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const file = value !== undefined ? (typeof value === 'string' ? null : value) : localFile;
  const urlValue = typeof value === 'string' ? value : null;
  const fileName = file ? file.name : (urlValue ? urlValue.split('/').pop() : null);

  const getFileSize = (): number | null => {
    if (file) {
      return file.size;
    }
    if (typeof value === 'string' && value.startsWith('data:')) {
      const base64Content = value.split(',')[1];
      if (base64Content) {
        return Math.round((base64Content.length * 3) / 4);
      }
    }
    return null;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Octet';
    const k = 1024;
    const sizes = ['Octets', 'Ko', 'Mo', 'Go'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const inputId = `${type}-${Math.random().toString(36).slice(2, 8)}`;

  if (!enabled) {
    return (
      <div className="flex h-24 items-center justify-center rounded-md border border-dashed border-border bg-bg-base text-xs text-text-tertiary">
        Mode désactivé
      </div>
    );
  }

  // 1. Types de repli par défaut si non spécifiés par le créateur
  const defaultAcceptTypes = {
    image: 'image/*',
    video: 'video/*',
    file: 'image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv'
  };

  const defaultExtensionsLabels = {
    image: 'PNG, JPG, WebP',
    video: 'MP4, WebM',
    file: 'PDF, DOC, XLS, TXT, CSV'
  };

  const acceptString = accept || contextField?.validation?.accept?.join(', ') || defaultAcceptTypes[type];
  const maxFileSize = maxSize || contextField?.validation?.max_file_size_mb || 10;

  // Libellés d'extensions formatés pour le sous-texte
  const allowedExtensionsText = contextField?.validation?.accept && contextField.validation.accept.length > 0
    ? contextField.validation.accept.map(ext => ext.replace(/^\./, '').toUpperCase()).join(', ')
    : defaultExtensionsLabels[type];

  // 2. Libellés de dépôt
  const placeholders = {
    image: 'Cliquez pour choisir une image ou glissez-la ici',
    video: 'Cliquez pour choisir une vidéo ou glissez-la ici',
    file: 'Cliquez pour choisir un fichier ou glissez-le ici'
  };

  const handleFileChange = (selectedFile: File | null) => {
    // TODO: upload Supabase Storage
    if (onChange) {
      onChange(selectedFile);
    } else {
      setLocalFile(selectedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (preview) return;
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (preview) return;

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      handleFileChange(droppedFile);
    }
  };

  // 3. Styles cohérents et modernes utilisant les variables CSS Papyrus & Mooove
  const currentBorderColor = isDragOver || isHovered
    ? 'var(--mooove-cyan, #06b6d4)'
    : 'var(--papyrus-border, var(--border-strong))';

  const currentBgColor = isDragOver || isHovered
    ? 'color-mix(in srgb, var(--mooove-cyan) 5%, transparent)'
    : 'var(--papyrus-surface, var(--bg-surface))';

  const containerStyle = {
    border: `1px dashed ${currentBorderColor}`,
    borderRadius: 'var(--radius-md, 8px)',
    padding: '24px',
    textAlign: 'center' as const,
    backgroundColor: currentBgColor,
    cursor: 'pointer',
    transition: 'border-color 0.2s ease, background-color 0.2s ease',
  };

  // Rendu de l'état après sélection de fichier
  if (fileName) {
    return (
      <div
        className="flex items-center justify-between gap-3 px-4 py-3.5 border rounded-lg bg-bg-surface"
        style={{ borderColor: 'var(--papyrus-border, var(--border-strong))' }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
          <span className="truncate text-sm font-medium text-text-primary">
            {fileName}
            {getFileSize() !== null && (
              <span className="ml-1.5 text-xs text-text-tertiary font-normal">
                ({formatFileSize(getFileSize()!)})
              </span>
            )}
          </span>
        </div>
        <button
          type="button"
          onClick={() => handleFileChange(null)}
          className="text-xs font-semibold text-accent hover:underline shrink-0 cursor-pointer underline-offset-4"
        >
          Changer
        </button>
      </div>
    );
  }

  return (
    <label
      htmlFor={inputId}
      style={containerStyle}
      className="flex flex-col items-center justify-center gap-2.5"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Upload className="h-6 w-6 text-text-tertiary" />
      <span className="text-center space-y-1">
        <span className="block text-sm font-medium text-text-primary">
          {placeholders[type]}
        </span>
        <span className="block text-xs text-text-tertiary">
          Formats acceptés : {allowedExtensionsText} · Max {maxFileSize} Mo
        </span>
      </span>
      <input
        id={inputId}
        type="file"
        accept={acceptString}
        className="hidden"
        required={required && !preview && !file}
        disabled={preview}
        onChange={(e) => {
          const selectedFile = e.target.files?.[0] || null;
          handleFileChange(selectedFile);
        }}
      />
    </label>
  );
}