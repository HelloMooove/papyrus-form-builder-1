// types/index.ts — Source unique de vérité pour les types Papyrus

export type FieldType =
  | 'short_text'
  | 'long_text'
  | 'email'
  | 'phone'
  | 'number'
  | 'url'
  | 'single_choice'
  | 'multiple_choice'
  | 'dropdown'
  | 'rating'
  | 'nps'
  | 'date'
  | 'file'
  | 'section_break'
  | 'statement'
  | 'image'
  | 'video'
  | 'matrix';

export type DisplayMode = 'scroll' | 'sections' | 'typeform';
export type FormStatus = 'draft' | 'published' | 'closed';
export type AccessType = 'public' | 'private' | 'password';
export type TeamRole = 'admin' | 'member';

/**
 * Périmètre d'un modèle (template).
 * - `personal` : visible uniquement par son créateur
 * - `workspace` : partagé avec son équipe (workspace = `team` dans la BDD)
 * - `global` : modèle officiel Mooove, visible par tous
 */
export type FormScope = 'personal' | 'workspace' | 'global';

export interface MultilingualText {
  fr: string;
  en?: string;
  es?: string;
  [lang: string]: string | undefined;
}

export interface FieldOption {
  id: string;
  label: MultilingualText;
  value?: string;
  /** Points attribués à cette option dans le système de scoring (0 par défaut) */
  points?: number;
}

/**
 * Sous-champ d'une question — utilise (presque) la même forme qu'un Field, sans les métadonnées
 * du formulaire (form_id, field_order). Les sous-champs s'appliquent à toutes les options cochées
 * d'un multiple_choice : leur valeur est collectée séparément pour chaque option cochée.
 */
export interface SubField {
  id: string;
  type: FieldType;
  label: MultilingualText;
  description: MultilingualText;
  placeholder: MultilingualText;
  options: FieldOption[];
  rows?: FieldOption[];
  required: boolean;
  validation: FieldValidation;
  style?: FieldStyle;
}

export interface FieldValidation {
  min?: number;
  max?: number;
  pattern?: string;
  accept?: string[]; // pour fichiers
  default_country?: string; // ISO 2-letter pour le champ phone
  // Pour les champs Image, Vidéo, Fichier — modes créateur/répondant
  creator_mode_enabled?: boolean; // Si le créateur peut ajouter du contenu
  respondent_mode_enabled?: boolean; // Si le répondant peut uploader du contenu
  media_url?: string; // URL ou data URL du contenu ajouté par le créateur
  max_file_size_mb?: number; // Taille max des fichiers pour le mode répondant (1-50 MB)
  alignment?: 'left' | 'center' | 'right'; // pour l'alignement du contenu créateur
  image_width?: number; // Largeur de l'image en pixels (pour type 'image')
  image_height?: number; // Hauteur de l'image en pixels (pour type 'image')
  show_title?: boolean; // Pour 'image' et 'video' — affiche le titre au-dessus du contenu
  original_width?: number; // Largeur d'origine de l'image (pour le reset)
  original_height?: number; // Hauteur d'origine de l'image (pour le reset)
  ratio_locked?: boolean; // Pour 'image' — verrouillage du ratio d'aspect (défaut: true)
  image_position_x?: number; // Position X de l'image sur le canvas (en px)
  image_position_y?: number; // Position Y de l'image sur le canvas (en px)
  // Pour les champs réponse courte avec type numérique
  response_type?: 'text' | 'integer' | 'decimal'; // Type de réponse pour short_text
  max_decimals?: number; // Nombre max de décimales pour type decimal (1-3)
  unit?: 'none' | 'euro' | 'dollar' | 'pound' | 'rupee' | 'mur' | 'kg' | 'g' | 'lb' | 'cm' | 'm' | 'ft' | 'in' | 'miles' | 'arpent' | 'percent'; // Unité pour les nombres
  user_can_choose_unit?: boolean; // Si l'utilisateur peut choisir l'unité
  // Pour les champs bannière et logo
  banner_fit?: 'cover' | 'contain'; // pour 'banner' — mode d'affichage
  banner_position_x?: number; // pour 'banner' — position horizontale (0-100)
  banner_position_y?: number; // pour 'banner' — position verticale (0-100)
  full_width?: boolean; // pour 'banner' et 'logo' — largeur plein écran
  logo_size?: 'sm' | 'md' | 'lg'; // pour 'logo' — taille du logo
  logo_position_x?: number; // pour 'logo' — position horizontale (0-100)
  logo_position_y?: number; // pour 'logo' — position verticale (0-100)
  logo_shape?: 'circle' | 'rounded' | 'rectangle'; // pour 'logo' — forme
  matrix_mode?: 'single' | 'multiple'; // pour 'matrix'
  has_other?: boolean; // pour les champs à choix : ajoute une option "Autre" avec texte libre
  other_label?: string; // libellé de l'option "Autre" (par défaut : "Autre")
  options_columns?: 1 | 2 | 3; // nombre de colonnes pour disposer les options
  display_style?: 'cards' | 'buttons'; // pour 'single_choice' — cartes (défaut) ou boutons pleins
  has_subfields?: boolean; // pour 'multiple_choice' — active les sous-questions appliquées à chaque option cochée
  randomize_options?: boolean; // pour les champs à choix — mélange l'ordre des options côté répondant
  selection_min?: number; // pour 'multiple_choice' — nombre minimum de cases à cocher
  selection_max?: number; // pour 'multiple_choice' — nombre maximum de cases à cocher
}

/** Familles disponibles dans le sélecteur de police par champ.
 *  - `sans` / `display` → Aktiv Grotesk (défaut Mooove). Les deux mappent à la même police.
 *  - `serif` → Georgia (identité Papyrus, en option pour les titres / textes avec caractère).
 *  - `mono` → JetBrains Mono. */
export type FontFamily = 'sans' | 'display' | 'serif' | 'mono';
export type LabelSize = 'sm' | 'md' | 'lg' | 'xl';
export type LabelWeight = 'normal' | 'medium' | 'bold';
export type TextAlign = 'left' | 'center' | 'right';

export interface FieldStyle {
  label_color?: string;
  label_size?: LabelSize;
  label_weight?: LabelWeight;
  label_align?: TextAlign;
  label_italic?: boolean;
  font_family?: FontFamily;
  icon_enabled?: boolean;
  icon_value?: string;
}

export type LayoutWidth = 'full' | 'half';

export interface Field {
  id: string;
  form_id: string;
  type: FieldType;
  label: MultilingualText;
  description: MultilingualText;
  placeholder: MultilingualText;
  options: FieldOption[]; // pour 'matrix' = colonnes
  rows?: FieldOption[]; // uniquement pour 'matrix' = lignes
  required: boolean;
  field_order: number;
  validation: FieldValidation;
  style?: FieldStyle;
  /** Largeur dans la mise en page : 'full' (défaut, 1/1) ou 'half' (1/2 — permet 2 par ligne). */
  layout_width?: LayoutWidth;
  /**
   * Sous-champs (multiple_choice seulement) — un seul jeu de sous-questions, appliqué à
   * chaque option cochée par le répondant. Les colonnes générées en BDD respectent le format
   * `[field_id]__[option_slug]__[subfield_id]`.
   */
  subfields?: SubField[];
  created_at?: string;
}

export interface LogicCondition {
  source_field_id: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than';
  value: string;
}
export type LogicAction = 'show_field' | 'hide_field' | 'jump_to' | 'end_form';

export interface LogicRule {
  id: string;
  form_id: string;
  conditions: LogicCondition[];
  conditions_operator: 'AND' | 'OR';
  action_type: LogicAction;
  target_field_id?: string;
  rule_order: number;
}

export type BackgroundType = 'color' | 'gradient' | 'image' | 'preset';
export type BannerFit = 'cover' | 'contain';
export type BannerPosition = 'top' | 'center' | 'bottom';

export interface FormTheme {
  // Legacy / résolu
  bg: string;
  accent: string;
  font: string;
  // Style des questions appliqué globalement (overridable par champ)
  field_style?: FieldStyle;
  // Bannière
  banner_url?: string | null;
  banner_fit?: BannerFit;
  banner_position?: BannerPosition;
  banner_position_x?: number; // Position horizontale (0-100)
  banner_position_y?: number; // Position verticale (0-100)
  banner_scale?: number; // Facteur de zoom (0.5-3, défaut: 1)
  banner_full_width?: boolean; // Bannière sur toute la largeur du viewport
  // Arrière-plan détaillé
  bg_type?: BackgroundType;
  bg_color?: string;
  bg_gradient_from?: string;
  bg_gradient_to?: string;
  bg_gradient_angle?: number; // degrés
  bg_image_url?: string;
  bg_image_opacity?: number; // 0-100 (opacité de l'overlay parchemin par-dessus l'image)
  bg_preset?: string;
  // Couleur des blocs (cartes des questions)
  field_bg_color?: string;
  field_border_color?: string;
  // Logo (position fixe style LinkedIn)
  logo_url?: string | null;
  logo_shape?: 'circle' | 'rounded'; // Forme du logo : rond ou carré
  logo_size?: number; // Zoom du logo (0.5-3, défaut: 1)
  // Divers
  text_color?: string;
  button_style?: 'filled' | 'outline' | 'ghost';
  dark_mode?: boolean;
  fields_icons_enabled?: boolean;
  /** Libellé personnalisé du score (défaut: "Score") */
  score_label?: string;
  /** Description personnalisée du score (défaut: "Basé sur vos réponses à ce formulaire") */
  score_description?: string;
  /** Niveaux de maturité personnalisés */
  score_levels?: ScoreLevel[];
}

export interface ScoreLevel {
  minPercent: number;
  title: string;
  description: string;
  color: 'green' | 'blue' | 'orange' | 'red';
}

export interface Form {
  id: string;
  team_id: string;
  workspace_id?: string;
  created_by?: string;
  title: string;
  slug: string;
  description?: string;
  display_mode: DisplayMode;
  status: FormStatus;
  is_template: boolean;
  template_origin_id?: string | null;
  /** Périmètre de visibilité quand le form est un modèle (`is_template = true`). */
  scope?: FormScope;
  /** Catégorie d'un modèle (« Sondage », « RH », « Événement »…) — utilisée pour le tri. */
  template_category?: string;
  /** Brève description d'un modèle — affichée sur la carte. */
  template_description?: string;
  /** Icône Lucide (nom) à afficher sur la carte du modèle. */
  template_icon?: string;
  theme: FormTheme;
  access_type: AccessType;
  access_password?: string | null;
  languages: string[];
  default_language: string;
  fields?: Field[];
  logic_rules?: LogicRule[];
  /** Si vrai, l'avancée du répondant est sauvegardée en localStorage et proposée au rechargement. */
  save_and_resume?: boolean;
  /** Si vrai, un même email ne peut soumettre qu'une seule fois (nécessite un champ email). */
  unique_email?: boolean;
  /** Si vrai, les nouveaux champs créés sont requis par défaut. */
  require_all_by_default?: boolean;
  /** Si vrai, active le système de scoring avec attribution de points aux réponses. */
  scoring_enabled?: boolean;
  /** Si vrai, affiche le score final au répondant (nécessite scoring_enabled). */
  show_score_to_respondent?: boolean;
  published_at?: string | null;
  closes_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: string;
  name: string;
  plan: 'free' | 'pro' | 'team';
  created_at: string;
}

export interface TeamMember {
  user_id: string;
  team_id: string;
  role: TeamRole;
  joined_at: string;
}

export type DestinationType = 'supabase' | 'airtable' | 'google_sheets';

export interface FormDestination {
  id: string;
  form_id: string;
  type: DestinationType;
  config: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
}

export type ActionType = 'webhook' | 'rest_api' | 'email';

export interface FormAction {
  id: string;
  form_id: string;
  type: ActionType;
  name: string;
  config: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
}

export type ChartType = 'bar' | 'pie' | 'line' | 'number' | 'word_cloud' | 'table';

export interface Chart {
  id: string;
  form_id: string;
  field_id?: string;
  type: ChartType;
  title?: string;
  config: Record<string, unknown>;
  ai_generated: boolean;
  display_order: number;
  created_at: string;
}

export interface FieldTranslation {
  id: string;
  form_id: string;
  language: string;
  translations: Record<string, { label?: string; description?: string; options?: Record<string, string> }>;
  ai_generated: boolean;
  manually_reviewed: boolean;
  created_at: string;
}

export interface Submission {
  id: string;
  form_id: string;
  respondent_language: string;
  ip_hash?: string;
  user_agent?: string;
  completed_at: string;
  actions_triggered: unknown[];
}

export interface FormStats {
  total_responses: number;
  completion_rate: number;
  avg_time_seconds: number;
  responses_by_day: { date: string; count: number }[];
}

export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer';
export type WorkspaceScope = 'personal' | 'team';

export interface WorkspaceMember {
  user_id: string;
  workspace_id: string;
  role: WorkspaceRole;
  joined_at: string;
  name?: string;
  email?: string;
}

export interface Workspace {
  id: string;
  name: string;
  scope: WorkspaceScope;
  is_deletable: boolean;
  created_by: string;
  created_at: string;
  members?: WorkspaceMember[];
  form_count?: number;
}

