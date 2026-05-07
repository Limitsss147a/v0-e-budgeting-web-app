// Database Types for E-Budgeting System

export type UserRole = 'admin' | 'user'
export type BudgetStatus = 'draft' | 'submitted' | 'under_review' | 'revision' | 'approved' | 'rejected'
export type NotificationType = 'status_change' | 'revision_request' | 'approval' | 'rejection' | 'info' | 'warning'
export type DocumentType = 'nota_dinas' | 'rka_dpa'

export interface Institution {
  id: string
  name: string
  code: string
  address: string | null
  phone: string | null
  email: string | null
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  institution_id: string | null
  role: UserRole
  admin_role: string | null
  full_name: string
  position: string | null
  phone: string | null
  avatar_url: string | null
  is_approved: boolean
  created_at: string
  updated_at: string
  // Joined data
  institution?: Institution
}

export interface FiscalYear {
  id: string
  year: number
  is_active: boolean
  start_date: string
  end_date: string
  created_at: string
}

export interface Program {
  id: string
  institution_id: string
  fiscal_year_id: string
  code: string
  name: string
  description: string | null
  total_ceiling: number
  created_at: string
  updated_at: string
  // Joined data
  institution?: Institution
  fiscal_year?: FiscalYear
}

export interface Activity {
  id: string
  program_id: string
  code: string
  name: string
  description: string | null
  total_ceiling: number
  created_at: string
  updated_at: string
  // Joined data
  program?: Program
}

export interface SubActivity {
  id: string
  activity_id: string
  code: string
  name: string
  description: string | null
  total_ceiling: number
  created_at: string
  updated_at: string
  // Joined data
  activity?: Activity
}

export interface Budget {
  id: string
  institution_id: string
  program_id: string | null
  activity_id: string | null
  sub_activity_id: string | null
  program_name: string | null
  activity_name: string | null
  sub_activity_name: string | null
  fiscal_year_id: string
  submitted_by: string | null
  reviewed_by: string | null
  title: string
  description: string | null
  total_amount: number
  status: BudgetStatus
  version: number
  submission_date: string | null
  review_date: string | null
  created_at: string
  updated_at: string
  // Joined data
  institution?: Institution
  program?: Program
  activity?: Activity
  sub_activity?: SubActivity
  fiscal_year?: FiscalYear
  submitter?: Profile
  reviewer?: Profile

  documents?: BudgetDocument[]
  revisions?: Revision[]
}



export interface BudgetDocument {
  id: string
  budget_id: string
  file_name: string
  file_path: string
  file_type: string
  file_size: number
  document_type: string
  uploaded_by: string | null
  created_at: string
  review_bapperida?: string
  review_setda?: string
  review_anggaran?: string
  review_aset?: string
  // Joined data
  uploader?: Profile
}

export interface Revision {
  id: string
  budget_id: string
  document_id?: string | null
  reviewer_id: string | null
  from_status: BudgetStatus
  to_status: BudgetStatus
  comments: string | null
  revision_notes: string | null
  created_at: string
  // Joined data
  reviewer?: Profile
}

export interface AuditLog {
  id: string
  user_id: string | null
  action: string
  table_name: string
  record_id: string | null
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
  // Joined data
  user?: Profile
}

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: NotificationType
  related_budget_id: string | null
  is_read: boolean
  read_at: string | null
  created_at: string
  // Joined data
  budget?: Budget
}

// Helper types for forms
export interface BudgetFormData {
  title: string
  description?: string
  program_id?: string
  activity_id?: string
  sub_activity_id?: string
  program_name?: string
  activity_name?: string
  sub_activity_name?: string
  items: BudgetItemFormData[]
}

export interface BudgetItemFormData {
  id?: string
  account_code?: string
  item_name: string
  description?: string
  specification?: string
  quantity: number
  unit: string
  unit_price: number
  quantity_before?: number
  unit_before?: string
  unit_price_before?: number
}

// Status badge mapping
export const statusConfig: Record<BudgetStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; color: string }> = {
  draft: { label: 'Draft', variant: 'secondary', color: 'bg-gray-100 text-gray-800' },
  submitted: { label: 'Diajukan', variant: 'default', color: 'bg-blue-100 text-blue-800' },
  under_review: { label: 'Sedang Direview', variant: 'outline', color: 'bg-yellow-100 text-yellow-800' },
  revision: { label: 'Perlu Revisi', variant: 'destructive', color: 'bg-orange-100 text-orange-800' },
  approved: { label: 'Disetujui', variant: 'default', color: 'bg-green-100 text-green-800' },
  rejected: { label: 'Ditolak', variant: 'destructive', color: 'bg-red-100 text-red-800' },
}

export const documentTypeLabels: Record<DocumentType, string> = {
  nota_dinas: 'Nota Dinas',
  rka_dpa: 'RKA/DPA',
}
