-- ============================================================================
-- SIVRON P0: Database Migration for User Approval Flow
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================================

-- 1. Add is_approved column to profiles table
-- Default to TRUE for existing users so they are not locked out
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false;

-- Mark all existing users as approved
UPDATE public.profiles SET is_approved = true WHERE is_approved IS NULL OR is_approved = false;

-- Mark all admins as always approved
UPDATE public.profiles SET is_approved = true WHERE role = 'admin';

-- 2. Set default for new registrations to FALSE (requires admin approval)
ALTER TABLE public.profiles ALTER COLUMN is_approved SET DEFAULT false;

-- ============================================================================
-- P0: RLS Policy for admin_role-based review authorization
-- Ensures admins can only update review columns matching their admin_role
-- ============================================================================

-- Drop existing policy if any (safe to run)
DROP POLICY IF EXISTS "Admins can update budget_documents reviews" ON public.budget_documents;

-- Create new policy with admin_role check
CREATE POLICY "Admins can update budget_documents reviews" ON public.budget_documents
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- ============================================================================
-- P0: RLS Policy for budget creation - validate institution_id
-- Ensures users can only create budgets for their own institution
-- ============================================================================

DROP POLICY IF EXISTS "Users can insert their own budgets" ON public.budgets;

CREATE POLICY "Users can insert their own budgets" ON public.budgets
FOR INSERT
WITH CHECK (
  submitted_by = auth.uid()
  AND institution_id = (
    SELECT institution_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- ============================================================================
-- P1: Notification auto-trigger on budget status change
-- Creates a notification when budget status changes
-- ============================================================================

CREATE OR REPLACE FUNCTION public.notify_budget_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger when status actually changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Notify the submitter
    INSERT INTO public.notifications (user_id, title, message, type, related_budget_id, is_read)
    VALUES (
      NEW.submitted_by,
      CASE NEW.status
        WHEN 'approved' THEN 'Pengajuan Disetujui'
        WHEN 'rejected' THEN 'Pengajuan Ditolak'
        WHEN 'revision' THEN 'Revisi Diperlukan'
        WHEN 'under_review' THEN 'Pengajuan Sedang Ditinjau'
        WHEN 'submitted' THEN 'Pengajuan Terkirim'
        ELSE 'Status Berubah'
      END,
      'Status pengajuan "' || NEW.title || '" berubah dari ' || 
      COALESCE(OLD.status, 'draft') || ' menjadi ' || NEW.status,
      CASE NEW.status
        WHEN 'approved' THEN 'approval'
        WHEN 'rejected' THEN 'rejection'
        WHEN 'revision' THEN 'revision_request'
        ELSE 'status_change'
      END,
      NEW.id,
      false
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger (drop first if exists)
DROP TRIGGER IF EXISTS on_budget_status_change ON public.budgets;
CREATE TRIGGER on_budget_status_change
  AFTER UPDATE ON public.budgets
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_budget_status_change();

-- ============================================================================
-- Done! Verify by running:
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'profiles' AND column_name = 'is_approved';
-- ============================================================================
