import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from 'sonner';

export interface Recipient {
  id: string;
  email: string;
  name: string | null;
  status: string;
  created_at: string;
}

export const useRecipients = () => {
  const queryClient = useQueryClient();

  const { data: recipients = [], isLoading } = useQuery({
    queryKey: ['recipients'],
    queryFn: async () => {
      const { data } = await api.get('/recipients');
      return data as Recipient[];
    },
  });

  const addRecipient = useMutation({
    mutationFn: async ({ email, name }: { email: string; name?: string }) => {
      await api.post('/recipients', { email, name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipients'] });
      toast.success('Recipient added successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to add recipient: ${error.message}`);
    },
  });

  const addBulkRecipients = useMutation({
    mutationFn: async (recipients: { email: string; name?: string }[]) => {
      await api.post('/recipients/bulk', recipients);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['recipients'] });
      toast.success(`Imported ${variables.length} recipients successfully`);
    },
    onError: (error: any) => {
      toast.error(`Failed to import recipients: ${error.message}`);
    },
  });

  const removeRecipient = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/recipients/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipients'] });
      toast.success('Recipient removed');
    },
    onError: (error: any) => {
      toast.error(`Failed to remove recipient: ${error.message}`);
    },
  });

  return {
    recipients,
    isLoading,
    addRecipient: addRecipient.mutate,
    addBulkRecipients: addBulkRecipients.mutate,
    removeRecipient: removeRecipient.mutate,
  };
};
