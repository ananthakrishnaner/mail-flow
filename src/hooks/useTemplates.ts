import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from 'sonner';

export interface Template {
  id: string;
  name: string;
  subject: string;
  html_content: string;
  created_at: string;
  updated_at: string;
}

export const useTemplates = () => {
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      const { data } = await api.get('/templates');
      return data as Template[];
    },
  });

  const addTemplate = useMutation({
    mutationFn: async ({ name, subject, htmlContent }: { name: string; subject: string; htmlContent: string }) => {
      await api.post('/templates', { name, subject, html_content: htmlContent });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success('Template created successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to create template: ${error.message}`);
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, name, subject, htmlContent }: { id: string; name: string; subject: string; htmlContent: string }) => {
      // Logic for update template if needed, or just insert new one
      await api.post('/templates', { name, subject, html_content: htmlContent });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success('Template updated successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to update template: ${error.message}`);
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success('Template deleted');
    },
    onError: (error: any) => {
      toast.error(`Failed to delete template: ${error.message}`);
    },
  });

  return {
    templates,
    isLoading,
    addTemplate: addTemplate.mutate,
    updateTemplate: updateTemplate.mutate,
    deleteTemplate: deleteTemplate.mutate,
  };
};
