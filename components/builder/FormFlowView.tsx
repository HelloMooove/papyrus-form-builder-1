'use client';

import { useMemo } from 'react';
import type { Form, Field, LogicRule } from '@/types';
import { cn } from '@/lib/utils';
import { GitFork } from 'lucide-react';

interface Props {
  form: Form;
}

interface RenderNode {
  id: string;
  type: 'field' | 'decision' | 'end';
  label: string;
  subtitle?: string;
  isConditional?: boolean;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface RenderEdge {
  id: string;
  fromId: string;
  toId: string;
  path: string;
  isDefault: boolean;
  label?: string;
}

function getFieldTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    short_text: 'Réponse courte',
    long_text: 'Réponse longue',
    email: 'Adresse e-mail',
    phone: 'Téléphone',
    number: 'Nombre',
    url: 'Lien site web',
    single_choice: 'Choix unique',
    multiple_choice: 'Choix multiple',
    dropdown: 'Liste déroulante',
    rating: 'Évaluation',
    nps: 'Score NPS',
    date: 'Date',
    file: 'Fichier / Média',
    matrix: 'Matrice',
    statement: 'Message / Note',
    section_break: 'Section'
  };
  return labels[type] || type;
}

function getConditionLabel(rule: LogicRule, fields: Field[]): string {
  if (!rule.conditions || rule.conditions.length === 0) return 'Si rempli';

  const condTexts = rule.conditions.map(c => {
    const sourceField = fields.find(f => f.id === c.source_field_id);
    let valText = c.value;
    if (sourceField && sourceField.options) {
      const opt = sourceField.options.find(o => o.id === c.value);
      if (opt && opt.label?.fr) {
        valText = opt.label.fr;
      }
    }

    let opSymbol = '';
    switch (c.operator) {
      case 'equals': opSymbol = '='; break;
      case 'not_equals': opSymbol = '≠'; break;
      case 'contains': return `contient "${valText}"`;
      case 'not_contains': return `ne contient pas "${valText}"`;
      case 'greater_than': opSymbol = '>'; break;
      case 'less_than': opSymbol = '<'; break;
      default: opSymbol = c.operator;
    }
    return `${opSymbol} "${valText}"`;
  });

  if (condTexts.length === 1) {
    return `Si ${condTexts[0]}`;
  }

  const op = rule.conditions_operator === 'OR' ? ' OU ' : ' ET ';
  return `Si (${condTexts.join(op)})`;
}

function truncateText(text: string, maxLen = 24): string {
  if (!text) return '';
  return text.length > maxLen ? text.substring(0, maxLen) + '...' : text;
}

function getBezierPath(x1: number, y1: number, x2: number, y2: number): string {
  const dy = Math.abs(y2 - y1) / 2;
  return `M ${x1} ${y1} C ${x1} ${y1 + dy} ${x2} ${y2 - dy} ${x2} ${y2}`;
}

export function FormFlowView({ form }: Props) {
  const fields = useMemo(() => {
    return (form.fields || [])
      .filter(f => f.type !== 'section_break')
      .sort((a, b) => a.field_order - b.field_order);
  }, [form.fields]);

  const rules = form.logic_rules || [];
  const hasRules = rules.length > 0;

  const layout = useMemo(() => {
    if (fields.length === 0) {
      return { nodes: [], edges: [], width: 800, height: 400, minX: 0, maxX: 800 };
    }

    // Paramètres graphiques
    const nodeW = 220;
    const nodeH = 64;
    const decisionW = 150;
    const decisionH = 34;
    const endW = 160;
    const endH = 44;
    const colW = 320;
    const rowH = 160;
    const centerX = 400;
    const paddingY = 50;

    const nodes: RenderNode[] = [];
    const edges: RenderEdge[] = [];

    // 1. Identifier les champs conditionnels (ceux affichés via show_field)
    const conditionalFields = new Set<string>();
    rules.forEach(r => {
      if (r.action_type === 'show_field' && r.target_field_id) {
        conditionalFields.add(r.target_field_id);
      }
    });

    // 2. Assigner des colonnes de façon récursive
    const colMap: Record<string, number> = {};
    fields.forEach(f => {
      if (!conditionalFields.has(f.id)) {
        colMap[f.id] = 0;
      }
    });

    const assignColumns = (fieldId: string, currentCol: number) => {
      // Trouver les règles de type show_field issues de conditions ciblant ce champ
      const childRules = rules.filter(r =>
        r.action_type === 'show_field' &&
        r.target_field_id &&
        r.conditions?.some(c => c.source_field_id === fieldId)
      );

      childRules.forEach((r, index) => {
        const targetId = r.target_field_id!;
        if (colMap[targetId] === undefined) {
          // Alterner gauche et droite pour les branches
          const direction = index % 2 === 0 ? -1 : 1;
          const step = Math.floor(index / 2) + 1;
          const targetCol = currentCol + direction * step;
          colMap[targetId] = targetCol;
          assignColumns(targetId, targetCol);
        }
      });
    };

    fields.forEach(f => {
      if (!conditionalFields.has(f.id)) {
        assignColumns(f.id, 0);
      }
    });

    // Fallback pour tout champ non assigné
    fields.forEach(f => {
      if (colMap[f.id] === undefined) {
        colMap[f.id] = 0;
      }
    });

    // 3. Positionner les nœuds de champs
    fields.forEach((f, index) => {
      const col = colMap[f.id];
      const row = index; // Position verticale alignée sur son index dans le formulaire
      const x = centerX + col * colW - nodeW / 2;
      const y = paddingY + row * rowH;

      nodes.push({
        id: f.id,
        type: 'field',
        label: f.label.fr || 'Champ sans titre',
        subtitle: getFieldTypeLabel(f.type),
        isConditional: conditionalFields.has(f.id),
        x,
        y,
        w: nodeW,
        h: nodeH
      });
    });

    // 4. Positionner les nœuds de décision et créer les transitions logiques
    fields.forEach(f => {
      const fieldRules = rules.filter(r =>
        r.conditions?.some(c => c.source_field_id === f.id)
      ).sort((a, b) => a.rule_order - b.rule_order);

      if (fieldRules.length === 0) return;

      const fRow = fields.indexOf(f);
      const fCol = colMap[f.id];
      const K = fieldRules.length;

      fieldRules.forEach((rule, j) => {
        // Calculer une colonne décalée pour éviter les chevauchements de décisions
        const decisionCol = fCol + (j - (K - 1) / 2) * 0.45;
        const x = centerX + decisionCol * colW - decisionW / 2;
        const y = paddingY + fRow * rowH + nodeH + 35; // Entre deux lignes

        const decisionId = `decision-${rule.id}`;
        nodes.push({
          id: decisionId,
          type: 'decision',
          label: getConditionLabel(rule, fields),
          x,
          y,
          w: decisionW,
          h: decisionH
        });

        // Liaison : Champ source -> Décision
        edges.push({
          id: `edge-${f.id}-${decisionId}`,
          fromId: f.id,
          toId: decisionId,
          path: getBezierPath(
            centerX + fCol * colW,
            paddingY + fRow * rowH + nodeH,
            x + decisionW / 2,
            y
          ),
          isDefault: false
        });

        // Liaison : Décision -> Cible
        if (rule.action_type === 'end_form') {
          // Vers la fin du formulaire
          edges.push({
            id: `edge-${decisionId}-end`,
            fromId: decisionId,
            toId: 'end_form',
            path: getBezierPath(
              x + decisionW / 2,
              y + decisionH,
              centerX,
              paddingY + fields.length * rowH
            ),
            isDefault: false
          });
        } else if (rule.target_field_id) {
          const target = fields.find(tf => tf.id === rule.target_field_id);
          if (target) {
            const tRow = fields.indexOf(target);
            const tCol = colMap[target.id];
            edges.push({
              id: `edge-${decisionId}-${target.id}`,
              fromId: decisionId,
              toId: target.id,
              path: getBezierPath(
                x + decisionW / 2,
                y + decisionH,
                centerX + tCol * colW,
                paddingY + tRow * rowH
              ),
              isDefault: false
            });
          }
        }
      });
    });

    // 5. Nœud de fin
    const endX = centerX - endW / 2;
    const endY = paddingY + fields.length * rowH;
    nodes.push({
      id: 'end_form',
      type: 'end',
      label: 'Fin du formulaire',
      x: endX,
      y: endY,
      w: endW,
      h: endH
    });

    // 6. Transitions par défaut (si aucune condition n'est remplie)
    fields.forEach((f, index) => {
      // Si le champ a une règle inconditionnelle de fin, pas de suite par défaut
      const hasUnconditionalEnd = rules.some(r =>
        r.action_type === 'end_form' &&
        (!r.conditions || r.conditions.length === 0) &&
        r.conditions?.some(c => c.source_field_id === f.id)
      );
      if (hasUnconditionalEnd) return;

      // Le successeur par défaut est le prochain champ visible non conditionnel
      const nextMainField = fields.slice(index + 1).find(tf => !conditionalFields.has(tf.id));
      const targetId = nextMainField ? nextMainField.id : 'end_form';
      const targetRow = nextMainField ? fields.indexOf(nextMainField) : fields.length;
      const targetCol = nextMainField ? colMap[nextMainField.id] : 0;

      const fCol = colMap[f.id];
      const fRow = index;

      edges.push({
        id: `default-${f.id}-${targetId}`,
        fromId: f.id,
        toId: targetId,
        path: getBezierPath(
          centerX + fCol * colW,
          paddingY + fRow * rowH + nodeH,
          centerX + targetCol * colW,
          paddingY + targetRow * rowH
        ),
        isDefault: true
      });
    });

    // 7. Calculer les dimensions de la zone de dessin
    let minCol = 0;
    let maxCol = 0;
    Object.values(colMap).forEach(c => {
      if (c < minCol) minCol = c;
      if (c > maxCol) maxCol = c;
    });

    // Si on a des décisions décalées horizontalement, on étend un peu les marges
    const marginL = minCol * colW - nodeW / 2 - 60;
    const marginR = maxCol * colW + nodeW / 2 + 60;

    const leftX = centerX + marginL;
    const rightX = centerX + marginR;

    const width = rightX - leftX;
    const height = endY + endH + 80;

    return {
      nodes,
      edges,
      width,
      height,
      minX: leftX,
      maxX: rightX
    };
  }, [fields, rules]);

  if (fields.length === 0) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center p-12 text-center">
        <GitFork className="h-12 w-12 text-text-tertiary mb-3 stroke-[1.5]" />
        <p className="font-display text-lg text-text-primary">Aucun champ dans ce formulaire</p>
        <p className="text-sm text-text-secondary mt-1">Ajoutez des questions pour générer le flux.</p>
      </div>
    );
  }

  const accentColor = form.theme?.accent || '#052139';

  return (
    <div className="relative w-full h-full flex flex-col bg-bg-base overflow-hidden">
      {/* Note d'information logique si vide */}
      {!hasRules && (
        <div className="shrink-0 bg-bg-elevated border-b border-border px-6 py-3.5 text-xs text-text-secondary italic font-body flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
          Aucune logique conditionnelle configurée. Affichage de la liste séquentielle par défaut.
        </div>
      )}

      {/* Container scrollable de l'arbre */}
      <div className="flex-1 overflow-auto p-8 flex items-start justify-start select-none">
        <svg
          width={layout.width}
          height={layout.height}
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          className="shrink-0"
        >
          {/* Définitions des têtes de flèches */}
          <defs>
            <marker
              id="arrow-accent"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 2 L 8 5 L 0 8 z" fill={accentColor} />
            </marker>
            <marker
              id="arrow-default"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 2 L 8 5 L 0 8 z" fill="#B8A080" />
            </marker>
          </defs>

          {/* Décaler tout le repère de minX pour que tout commence à x=0 */}
          <g transform={`translate(${-layout.minX}, 0)`}>
            {/* 1. Rendu des lignes de transition (les flèches d'abord, pour être en arrière-plan) */}
            {layout.edges.map(edge => {
              const markerId = edge.isDefault ? 'arrow-default' : 'arrow-accent';
              return (
                <path
                  key={edge.id}
                  d={edge.path}
                  fill="none"
                  stroke={edge.isDefault ? '#B8A080' : accentColor}
                  strokeWidth={edge.isDefault ? 1.5 : 2}
                  strokeDasharray={edge.isDefault ? '4,4' : undefined}
                  markerEnd={`url(#${markerId})`}
                  className="transition-all duration-300"
                />
              );
            })}

            {/* 2. Rendu des nœuds */}
            {layout.nodes.map(node => {
              if (node.type === 'field') {
                return (
                  <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
                    {/* Rectangle de fond */}
                    <rect
                      width={node.w}
                      height={node.h}
                      rx={8}
                      ry={8}
                      fill={node.isConditional ? '#FFF8F2' : '#FFFDF5'}
                      stroke={node.isConditional ? '#F6923E' : '#D4B896'}
                      strokeWidth={node.isConditional ? 1.8 : 1.2}
                      className="transition-all duration-300"
                    />
                    
                    {/* Contenu textuel */}
                    <text
                      x={14}
                      y={26}
                      fill="#052139"
                      fontSize={13}
                      fontWeight={600}
                      fontFamily="var(--font-aktiv), sans-serif"
                    >
                      {truncateText(node.label, 24)}
                    </text>
                    <text
                      x={14}
                      y={46}
                      fill={node.isConditional ? '#F6923E' : '#8B7355'}
                      fontSize={11}
                      fontWeight={500}
                      fontFamily="var(--font-aktiv), sans-serif"
                    >
                      {node.subtitle}
                    </text>

                    {/* Badge "Conditionnel" discret pour les champs masqués par défaut */}
                    {node.isConditional && (
                      <g transform="translate(140, 36)">
                        <rect
                          width={66}
                          height={16}
                          rx={4}
                          ry={4}
                          fill="#FFF2E6"
                          stroke="#F6923E"
                          strokeWidth={0.5}
                        />
                        <text
                          x={33}
                          y={11}
                          textAnchor="middle"
                          fill="#F6923E"
                          fontSize={9}
                          fontWeight={600}
                          fontFamily="var(--font-aktiv), sans-serif"
                        >
                          Conditionnel
                        </text>
                      </g>
                    )}
                  </g>
                );
              }

              if (node.type === 'decision') {
                return (
                  <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
                    {/* Capsule ovale */}
                    <rect
                      width={node.w}
                      height={node.h}
                      rx={17}
                      ry={17}
                      fill="#EFF9FE"
                      stroke="#2AC2DE"
                      strokeWidth={1.5}
                    />
                    
                    {/* Label de condition */}
                    <text
                      x={node.w / 2}
                      y={node.h / 2 + 4}
                      textAnchor="middle"
                      fill="#052139"
                      fontSize={10.5}
                      fontWeight={600}
                      fontFamily="var(--font-aktiv), sans-serif"
                    >
                      {truncateText(node.label, 20)}
                    </text>
                  </g>
                );
              }

              if (node.type === 'end') {
                return (
                  <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
                    {/* Grosse capsule de fin */}
                    <rect
                      width={node.w}
                      height={node.h}
                      rx={22}
                      ry={22}
                      fill={accentColor}
                      stroke={accentColor}
                      strokeWidth={1.5}
                    />
                    
                    <text
                      x={node.w / 2}
                      y={node.h / 2 + 5}
                      textAnchor="middle"
                      fill="#FFFDF5"
                      fontSize={13}
                      fontWeight={600}
                      fontFamily="var(--font-aktiv), sans-serif"
                    >
                      {node.label}
                    </text>
                  </g>
                );
              }

              return null;
            })}
          </g>
        </svg>
      </div>
    </div>
  );
}
