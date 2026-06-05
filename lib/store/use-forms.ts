'use client';

import { useEffect, useState } from 'react';
import type { Form } from '@/types';
import { getForm, listForms } from './index';

/** Hook qui s'abonne aux changements localStorage du store Papyrus. */
export function useForms(): Form[] {
  const [forms, setForms] = useState<Form[]>([]);

  useEffect(() => {
    const loadForms = async () => {
      try {
        const result = await listForms();
        setForms(result);
      } catch (error) {
        console.error('Failed to load forms:', error);
        setForms([]);
      }
    };

    loadForms();

    const refresh = () => {
      loadForms();
    };

    window.addEventListener('papyrus:forms-changed', refresh);
    window.addEventListener('papyrus:form-created', refresh);
    window.addEventListener('papyrus:form-updated', refresh);
    window.addEventListener('papyrus:form-deleted', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('papyrus:forms-changed', refresh);
      window.removeEventListener('papyrus:form-created', refresh);
      window.removeEventListener('papyrus:form-updated', refresh);
      window.removeEventListener('papyrus:form-deleted', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  return forms;
}

export function useForm(id: string): { form: Form | null; loading: boolean } {
  const [form, setForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadForm = async () => {
      setLoading(true);
      try {
        const result = await getForm(id);
        setForm(result);
      } catch (error) {
        console.error('Failed to load form:', error);
        setForm(null);
      } finally {
        setLoading(false);
      }
    };

    loadForm();

    const refresh = () => {
      loadForm();
    };

    window.addEventListener('papyrus:forms-changed', refresh);
    window.addEventListener('papyrus:form-created', refresh);
    window.addEventListener('papyrus:form-updated', refresh);
    window.addEventListener('papyrus:form-deleted', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('papyrus:forms-changed', refresh);
      window.removeEventListener('papyrus:form-created', refresh);
      window.removeEventListener('papyrus:form-updated', refresh);
      window.removeEventListener('papyrus:form-deleted', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [id]);

  return { form, loading };
}
