import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, FileCode, Trash2, Edit, Eye, Loader2 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useTemplates } from '@/hooks/useTemplates';
import { format } from 'date-fns';
import Editor from '@monaco-editor/react';

const defaultTemplate = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; }
    .header { background: #0d9488; color: white; padding: 20px; text-align: center; }
    .content { padding: 30px; background: #f9fafb; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Email Title</h1>
    </div>
    <div class="content">
      <p>Hello,</p>
      <p>Your content goes here...</p>
    </div>
    <div class="footer">
      <p>© 2024 Your Company</p>
    </div>
  </div>
</body>
</html>`;

export default function Templates() {
  const { templates, isLoading, addTemplate, updateTemplate, deleteTemplate } = useTemplates();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [htmlContent, setHtmlContent] = useState(defaultTemplate);

  const handleCreate = () => {
    if (name && subject && htmlContent) {
      addTemplate({ name, subject, htmlContent });
      setName('');
      setSubject('');
      setHtmlContent(defaultTemplate);
      setIsCreateDialogOpen(false);
    }
  };

  const handleEdit = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setEditingTemplate(templateId);
      setName(template.name);
      setSubject(template.subject);
      setHtmlContent(template.html_content);
      setIsCreateDialogOpen(true);
    }
  };

  const handleSaveEdit = () => {
    if (editingTemplate && name && subject) {
      updateTemplate({ id: editingTemplate, name, subject, htmlContent });
      setEditingTemplate(null);
      setName('');
      setSubject('');
      setHtmlContent(defaultTemplate);
      setIsCreateDialogOpen(false);
    }
  };

  const handlePreview = (templateId: string) => {
    setSelectedTemplate(templateId);
    setIsPreviewDialogOpen(true);
  };

  const previewTemplate = templates.find((t) => t.id === selectedTemplate);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Templates</h1>
            <p className="text-muted-foreground mt-1">
              Create and manage email templates
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
            setIsCreateDialogOpen(open);
            if (!open) {
              setEditingTemplate(null);
              setName('');
              setSubject('');
              setHtmlContent(defaultTemplate);
            }
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Create Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingTemplate ? 'Edit Template' : 'Create New Template'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Template Name *</label>
                    <Input
                      placeholder="Welcome Email"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Subject *</label>
                    <Input
                      placeholder="Welcome to our platform!"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">HTML Content</label>
                  <div className="h-[400px] border border-border rounded-lg overflow-hidden">
                    <Editor
                      height="100%"
                      defaultLanguage="html"
                      value={htmlContent}
                      onChange={(value) => setHtmlContent(value || '')}
                      theme="vs-dark"
                      options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        wordWrap: 'on',
                      }}
                    />
                  </div>
                </div>
                <Button 
                  onClick={editingTemplate ? handleSaveEdit : handleCreate} 
                  className="w-full"
                >
                  {editingTemplate ? 'Save Changes' : 'Create Template'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {templates.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-card border border-border rounded-xl p-16 text-center"
          >
            <FileCode className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">No templates yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first email template to get started
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Create Template
            </Button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template, index) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-card border border-border rounded-xl overflow-hidden group"
              >
                <div className="h-40 bg-muted/50 relative overflow-hidden">
                  <iframe
                    srcDoc={template.html_content}
                    className="w-[200%] h-[200%] transform scale-50 origin-top-left pointer-events-none"
                    title={template.name}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
                </div>
                <div className="p-4">
                  <h3 className="font-semibold">{template.name}</h3>
                  <p className="text-sm text-muted-foreground truncate">{template.subject}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Updated {format(new Date(template.updated_at), 'MMM dd, yyyy')}
                  </p>
                  <div className="flex items-center gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePreview(template.id)}
                      className="flex-1 gap-1"
                    >
                      <Eye className="w-4 h-4" />
                      Preview
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(template.id)}
                      className="gap-1"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteTemplate(template.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>{previewTemplate?.name}</DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              <div className="bg-muted rounded-lg p-2 mb-4">
                <p className="text-sm">
                  <span className="text-muted-foreground">Subject:</span>{' '}
                  <span className="font-medium">{previewTemplate?.subject}</span>
                </p>
              </div>
              <div className="border border-border rounded-lg overflow-hidden h-[500px]">
                <iframe
                  srcDoc={previewTemplate?.html_content}
                  className="w-full h-full"
                  title="Email Preview"
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
