import { useState, useRef, useEffect } from 'react'
import { Upload, X, FileText, Folder, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'https://workshelf.dev/api'

interface UploadResult {
  success: boolean
  message?: string
  documents?: Array<{
    title: string
    word_count: number
    size_bytes: number
  }>
  errors?: string[]
  total_size_bytes?: number
}

interface StorageInfo {
  used_bytes: number
  limit_bytes: number
  available_bytes: number
  usage_percentage: number
  used_formatted: string
  limit_formatted: string
  available_formatted: string
  tier: string
  tiers_available?: {
    [key: string]: {
      limit: number
      formatted: string
      price: string
    }
  }
}

interface BulkUploadModalProps {
  onClose: () => void
  onSuccess: () => void
  projectId?: number
  folderId?: number | null
}

export function BulkUploadModal({ onClose, onSuccess, projectId, folderId }: BulkUploadModalProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)

  // Load storage info on mount
  useEffect(() => {
    loadStorageInfo()
  }, [])

  const loadStorageInfo = async () => {
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${API_URL}/api/v1/storage/info`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setStorageInfo(data)
      }
    } catch (err) {
      console.error('Error loading storage info:', err)
    }
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      const file = files[0]
      if (file.name.endsWith('.zip') || file.name.endsWith('.md') || file.name.endsWith('.markdown')) {
        setSelectedFile(file)
      } else {
        alert('Please select a .zip file or .md/.markdown file')
      }
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      if (files.length === 1 && files[0].name.endsWith('.zip')) {
        // Single zip file
        setSelectedFile(files[0])
        setSelectedFiles([])
      } else {
        // Multiple files or folder
        setSelectedFile(null)
        setSelectedFiles(Array.from(files))
      }
    }
  }

  const handleUpload = async () => {
    if (!selectedFile && selectedFiles.length === 0) return

    setUploading(true)
    setResult(null)

    try {
      const token = localStorage.getItem('access_token')
      const formData = new FormData()
      
      if (selectedFile) {
        // Single zip file
        formData.append('files', selectedFile)
      } else {
        // Multiple files with paths
        const pathMap: Record<string, string> = {}
        selectedFiles.forEach((file, idx) => {
          formData.append('files', file)
          const relativePath = (file as any).webkitRelativePath || file.name
          pathMap[idx.toString()] = relativePath
        })
        formData.append('file_paths', JSON.stringify(pathMap))
      }
      
      if (projectId) {
        formData.append('project_id', projectId.toString())
      }
      
      if (folderId !== null && folderId !== undefined) {
        formData.append('folder_id', folderId.toString())
      }

      const response = await fetch(`${API_URL}/api/v1/storage/bulk-upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      const data = await response.json()

      if (response.ok) {
        setResult({ success: true, ...data })
        // Brief delay to show success message, then callback
        setTimeout(() => {
          onSuccess()
        }, 1000)
      } else {
        setResult({
          success: false,
          message: data.detail || 'Upload failed',
          errors: data.errors
        })
      }
    } catch (err) {
      setResult({
        success: false,
        message: err instanceof Error ? err.message : 'Upload failed'
      })
    } finally {
      setUploading(false)
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h3 className="text-xl font-bold">Import Documents</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Upload an Obsidian vault (.zip) or markdown files
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Storage Info */}
        {storageInfo && (
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-mono">Storage Used</span>
              <span className="text-sm font-mono">{storageInfo.used_formatted} / {storageInfo.limit_formatted}</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div
                className={`h-full transition-all ${
                  storageInfo.usage_percentage > 90 ? 'bg-red-500' :
                  storageInfo.usage_percentage > 70 ? 'bg-yellow-500' :
                  'bg-green-500'
                }`}
                style={{ width: `${Math.min(storageInfo.usage_percentage, 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-muted-foreground capitalize">{storageInfo.tier} Plan</span>
              <span className="text-xs text-muted-foreground">{storageInfo.available_formatted} available</span>
            </div>
          </div>
        )}

        {/* Upload Area */}
        <div className="p-6">
          {!result ? (
            <>
              <div
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragging
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                
                {selectedFile || selectedFiles.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2">
                      {selectedFile ? (
                        <>
                          {selectedFile.name.endsWith('.zip') ? (
                            <Folder className="w-5 h-5" />
                          ) : (
                            <FileText className="w-5 h-5" />
                          )}
                          <span className="font-mono text-sm">{selectedFile.name}</span>
                        </>
                      ) : (
                        <>
                          <Folder className="w-5 h-5" />
                          <span className="font-mono text-sm">{selectedFiles.length} files selected</span>
                        </>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {selectedFile ? formatBytes(selectedFile.size) : formatBytes(selectedFiles.reduce((sum, f) => sum + f.size, 0))}
                    </p>
                    <button
                      onClick={() => { setSelectedFile(null); setSelectedFiles([]) }}
                      className="text-sm text-primary hover:underline"
                    >
                      Choose different file(s)
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="text-lg font-mono mb-2">
                      Drag & drop your file here
                    </p>
                    <p className="text-sm text-muted-foreground mb-4">
                      or click to browse
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
                      >
                        Select File
                      </button>
                      <button
                        onClick={() => folderInputRef.current?.click()}
                        className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:opacity-90 transition-opacity"
                      >
                        Select Folder
                      </button>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".zip,.md,.markdown,.txt,.html,.htm,.docx,.odt,.pdf"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <input
                      ref={folderInputRef}
                      type="file"
                      /* @ts-expect-error - webkitdirectory and directory are non-standard HTML attributes for folder selection */
                      webkitdirectory=""
                      directory=""
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </>
                )}
              </div>

              <div className="mt-4 p-4 bg-muted rounded-lg">
                <p className="text-sm font-mono mb-2">Supported formats:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• <strong>.zip</strong> - Obsidian vault archives (preserves folder structure)</li>
                  <li>• <strong>Folders</strong> - Direct folder upload preserves full structure</li>
                  <li>• <strong>.md, .markdown</strong> - Markdown files</li>
                  <li>• <strong>.txt</strong> - Plain text files</li>
                  <li>• <strong>.html, .htm</strong> - HTML documents</li>
                  <li>• <strong>.docx</strong> - Microsoft Word documents</li>
                  <li>• <strong>.odt</strong> - OpenDocument Text</li>
                  <li>• <strong>.pdf</strong> - PDF documents (text extraction)</li>
                  <li>• Obsidian YAML frontmatter will be parsed and preserved</li>
                </ul>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              {result.success ? (
                <>
                  <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/50 rounded-lg">
                    <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-mono font-bold">Upload Successful!</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {result.documents?.length || 0} documents imported
                        {result.total_size_bytes && ` (${formatBytes(result.total_size_bytes)})`}
                      </p>
                    </div>
                  </div>

                  {result.documents && result.documents.length > 0 && (
                    <div className="max-h-64 overflow-y-auto space-y-2">
                      <p className="text-sm font-mono font-bold mb-2">Imported Documents:</p>
                      {result.documents.map((doc, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <FileText className="w-4 h-4 flex-shrink-0" />
                            <span className="text-sm font-mono truncate">{doc.title}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>{doc.word_count} words</span>
                            <span>{formatBytes(doc.size_bytes)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {result.errors && result.errors.length > 0 && (
                    <div className="p-4 bg-yellow-500/10 border border-yellow-500/50 rounded-lg">
                      <p className="text-sm font-mono font-bold mb-2">Some files skipped:</p>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        {result.errors.map((error: any, idx: number) => (
                          <li key={idx}>
                            • {typeof error === 'string' ? error : `${error.file}: ${error.error}`}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-mono font-bold">Upload Failed</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {result.message || 'An error occurred during upload'}
                    </p>
                    {result.errors && result.errors.length > 0 && (
                      <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                        {result.errors.map((error, idx) => (
                          <li key={idx}>
                            • {typeof error === 'string' ? error : `${error.file}: ${error.error}`}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!result && (
          <div className="flex gap-2 justify-end p-6 border-t border-border">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-muted text-foreground hover:opacity-90"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={(!selectedFile && selectedFiles.length === 0) || uploading}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Upload</span>
                </>
              )}
            </button>
          </div>
        )}

        {result && (
          <div className="flex gap-2 justify-end p-6 border-t border-border">
            <button
              onClick={() => {
                setResult(null)
                setSelectedFile(null)
                setSelectedFiles([])
              }}
              className="px-4 py-2 rounded-lg bg-muted text-foreground hover:opacity-90"
            >
              Upload Another
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
