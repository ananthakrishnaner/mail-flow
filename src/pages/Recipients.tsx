import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Plus, Upload, Trash2, Search, Mail, Loader2, FileText, Download } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useRecipients } from '@/hooks/useRecipients';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';

const statusStyles = {
  pending: 'bg-warning/20 text-warning',
  sent: 'bg-success/20 text-success',
  failed: 'bg-destructive/20 text-destructive',
  scheduled: 'bg-primary/20 text-primary',
};

export default function Recipients() {
  const { recipients, isLoading, addRecipient, addBulkRecipients, removeRecipient } = useRecipients();
  const [searchQuery, setSearchQuery] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [bulkEmails, setBulkEmails] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [isCsvDialogOpen, setIsCsvDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredRecipients = recipients.filter(
    (r) =>
      r.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddRecipient = () => {
    if (newEmail) {
      addRecipient({ email: newEmail, name: newName || undefined });
      setNewEmail('');
      setNewName('');
      setIsAddDialogOpen(false);
    }
  };

  const handleBulkAdd = () => {
    const emails = bulkEmails
      .split(/[\n,;]/)
      .map((e) => e.trim())
      .filter((e) => e && e.includes('@'));
    if (emails.length > 0) {
      addBulkRecipients(emails.map(e => ({ email: e })));
      setBulkEmails('');
      setIsBulkDialogOpen(false);
    }
  };

  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());

      // Skip header row if it exists
      const hasHeader = lines[0]?.toLowerCase().includes('email');
      const dataLines = hasHeader ? lines.slice(1) : lines;

      const parsedRecipients: { email: string; name?: string }[] = [];

      dataLines.forEach(line => {
        const parts = line.split(',').map(p => p.trim().replace(/^["']|["']$/g, ''));
        const email = parts[0];
        const name = parts[1] || undefined;

        if (email && email.includes('@')) {
          parsedRecipients.push({ email, name });
        }
      });

      if (parsedRecipients.length > 0) {
        addBulkRecipients(parsedRecipients);
        // toast success is handled in hook
        setIsCsvDialogOpen(false);
      } else {
        toast.error('No valid emails found in CSV');
      }
    };
    reader.readAsText(file);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadSampleCsv = () => {
    const link = document.createElement('a');
    link.href = '/sample-recipients.csv';
    link.download = 'sample-recipients.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
            <h1 className="text-3xl font-bold">Recipients</h1>
            <p className="text-muted-foreground mt-1">
              Manage your email recipient list
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* CSV Import Dialog */}
            <Dialog open={isCsvDialogOpen} onOpenChange={setIsCsvDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <FileText className="w-4 h-4" />
                  CSV Import
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Import Recipients from CSV</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="bg-muted/50 border border-border rounded-lg p-4">
                    <p className="text-sm text-muted-foreground mb-3">
                      Upload a CSV file with columns: <code className="bg-muted px-1 rounded">email</code> and optionally <code className="bg-muted px-1 rounded">name</code>
                    </p>
                    <Button variant="outline" size="sm" onClick={downloadSampleCsv} className="gap-2">
                      <Download className="w-4 h-4" />
                      Download Sample CSV
                    </Button>
                  </div>

                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-4">
                      Click to upload or drag and drop
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleCsvUpload}
                      className="hidden"
                      id="csv-upload"
                    />
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Select CSV File
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Bulk Import Dialog */}
            <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Upload className="w-4 h-4" />
                  Bulk Import
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Bulk Import Recipients</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <textarea
                    className="w-full h-48 p-3 rounded-lg border border-input bg-background text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Paste emails here (one per line, or separated by commas)"
                    value={bulkEmails}
                    onChange={(e) => setBulkEmails(e.target.value)}
                  />
                  <Button onClick={handleBulkAdd} className="w-full">
                    Import Emails
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Add Single Recipient Dialog */}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Recipient
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Recipient</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Email *</label>
                    <Input
                      type="email"
                      placeholder="email@example.com"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Name (optional)</label>
                    <Input
                      placeholder="John Doe"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleAddRecipient} className="w-full">
                    Add Recipient
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search recipients..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-card border border-border rounded-xl overflow-hidden"
        >
          {filteredRecipients.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Mail className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No recipients yet</p>
              <p className="text-sm">Add recipients to start sending emails</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">
                    Email
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">
                    Name
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">
                    Added
                  </th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody>
                {filteredRecipients.map((recipient, index) => (
                  <motion.tr
                    key={recipient.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="border-t border-border hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-6 py-4 font-medium">{recipient.email}</td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {recipient.name || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={cn('capitalize', statusStyles[recipient.status as keyof typeof statusStyles] || statusStyles.pending)}>
                        {recipient.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {format(new Date(recipient.created_at), 'MMM dd, yyyy')}
                    </td>
                    <td className="px-6 py-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRecipient(recipient.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </motion.div>
      </div>
    </DashboardLayout>
  );
}