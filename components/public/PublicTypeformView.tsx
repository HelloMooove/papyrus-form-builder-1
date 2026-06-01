'use client';

import { useState, useEffect } from 'react';
import type { Form, Field } from '@/types';
import type { ScoreResult } from '@/lib/scoring';
import { FormHeader } from '@/components/builder/FormHeader';
import { ScoreDisplay } from '@/components/respondent/ScoreDisplay';
import { FieldRenderer } from '@/components/builder/FieldRenderer';
import { PublicFieldCard } from './PublicFieldCard';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ArrowRight, Check } from 'lucide-react';

interface Props {
  form: Form;
  responses: Record<string, any>;
  updateResponse: (fieldId: string, response: any) => void;
  visibleFields: Set<string>;
  onSubmit: () => Promise<void>;
  isSubmitting: boolean;
  validateRequiredFields: () => { isValid: boolean; missingFields: Field[] };
  scoreResult?: ScoreResult;
  showScoreToRespondent?: boolean;
}

export function PublicTypeformView({
  form,
  responses,
  updateResponse,
  visibleFields,
  onSubmit,
  isSubmitting,
  validateRequiredFields,
  scoreResult,
  showScoreToRespondent
}: Props) {
  const fields = form.fields?.filter(f => visibleFields.has(f.id)) || [];
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showIntro, setShowIntro] = useState(true);

  const total = fields.length;
  const currentField = fields[currentIdx];
  const progress = total > 0 ? ((currentIdx + 1) / total) * 100 : 0;
  const isLast = currentIdx === total - 1;

  // Commencer par l'intro
  if (showIntro) {
    return (
      <div className="min-h-screen flex items-center justify-center px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto max-w-2xl text-center"
        >
          <FormHeader
            theme={form.theme}
            selectedElement={null}
            onSelectBanner={() => {}}
            onSelectLogo={() => {}}
            preview={true}
          />

          <div className="mb-8">
            <h1 className="font-display text-4xl text-text-primary mb-4">
              {form.title}
            </h1>
            {form.description && (
              <p className="text-lg text-text-secondary leading-relaxed">
                {form.description}
              </p>
            )}
          </div>

          <button
            onClick={() => setShowIntro(false)}
            className={cn(
              'inline-flex items-center gap-2 rounded-xl px-8 py-4 text-lg font-medium transition',
              'bg-accent text-white hover:opacity-90'
            )}
          >
            Commencer
            <ArrowRight className="h-5 w-5" />
          </button>

          <p className="text-sm text-text-tertiary mt-6">
            {total} question{total > 1 ? 's' : ''} · Appuyez sur Entrée pour avancer
          </p>
        </motion.div>
      </div>
    );
  }

  // Validation de champ individuel
  const validateCurrentField = () => {
    if (!currentField || !currentField.required) return true;

    const value = responses[currentField.id];
    return value !== undefined && value !== null &&
           (typeof value !== 'string' || value.trim() !== '');
  };

  const handleNext = async () => {
    // Validation du champ courant
    if (!validateCurrentField()) {
      alert('Ce champ est obligatoire');
      return;
    }

    if (isLast) {
      // Soumission finale
      const validation = validateRequiredFields();
      if (!validation.isValid) {
        alert('Veuillez remplir tous les champs obligatoires');
        return;
      }
      await onSubmit();
    } else {
      // Question suivante
      setCurrentIdx(i => Math.min(total - 1, i + 1));
    }
  };

  // Navigation par clavier
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !isSubmitting) {
        e.preventDefault();
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIdx, responses, isSubmitting]);

  if (!currentField) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Aucune question disponible</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Barre de progression */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <div
          className="h-1 bg-accent transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Numéro de question */}
      <div className="fixed top-4 right-4 z-40">
        <span className="text-sm text-text-tertiary">
          {currentIdx + 1} / {total}
        </span>
      </div>

      <div className="min-h-screen flex items-center justify-center px-8 py-12">
        <div className="mx-auto w-full max-w-2xl">

          <AnimatePresence mode="wait">
            <motion.div
              key={currentField.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >

              {/* Question */}
              <div className="mb-8">
                <h2 className="font-display text-3xl text-text-primary mb-4">
                  <span className="text-accent mr-2">
                    {currentIdx + 1}.
                  </span>
                  {currentField.label.fr}
                  {currentField.required && (
                    <span className="text-red-500 ml-2">*</span>
                  )}
                </h2>

                {currentField.description.fr && (
                  <p className="text-lg text-text-secondary leading-relaxed">
                    {currentField.description.fr}
                  </p>
                )}
              </div>

              {/* Champ de saisie */}
              <div className="mb-8">
                {currentField.type === 'section_break' ||
                 currentField.type === 'statement' ||
                 currentField.type === 'image' ||
                 currentField.type === 'video' ? (
                  <PublicFieldCard
                    field={currentField}
                    form={form}
                    span="col-span-2"
                    responses={responses}
                    updateResponse={updateResponse}
                  />
                ) : (
                  <FieldRenderer
                    field={currentField}
                    preview={false}
                    mobile={false}
                    value={responses[currentField.id]}
                    onValueChange={(val) => updateResponse(currentField.id, val)}
                  />
                )}
              </div>

              {/* Score sur dernière question */}
              {isLast && showScoreToRespondent && scoreResult && scoreResult.maxScore > 0 && (
                <div className="mb-8">
                  <ScoreDisplay
                    scoreResult={scoreResult}
                    scoreLabel={form.theme.score_label}
                    scoreDescription={form.theme.score_description}
                  />
                </div>
              )}

              {/* Bouton suivant */}
              <button
                onClick={handleNext}
                disabled={isSubmitting}
                className={cn(
                  'inline-flex items-center gap-2 rounded-xl px-6 py-3 text-lg font-medium transition',
                  'bg-accent text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {isLast ? (
                  isSubmitting ? (
                    'Envoi...'
                  ) : (
                    <>
                      <Check className="h-5 w-5" />
                      Envoyer
                    </>
                  )
                ) : (
                  <>
                    Suivant
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>

              <p className="text-sm text-text-tertiary mt-4">
                Appuyez sur Entrée ↵
              </p>

            </motion.div>
          </AnimatePresence>

        </div>
      </div>
    </div>
  );
}