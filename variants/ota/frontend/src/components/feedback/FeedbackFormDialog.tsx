import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { submitFeedback, type FeedbackCategory } from '@/services/feedbackService';

const TITLE_MAX = 80;
const BODY_MAX = 2000;

const CATEGORIES: FeedbackCategory[] = ['bug', 'feature', 'ui', 'block', 'docs', 'other'];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FeedbackFormDialog({ open, onOpenChange }: Props) {
  const { t } = useTranslation();

  const [category, setCategory] = useState<FeedbackCategory | ''>('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [submittedId, setSubmittedId] = useState<number | null>(null);

  useEffect(() => {
    if (!open) {
      // Reset on close so the next open shows a fresh form (success state cleared too).
      setCategory('');
      setTitle('');
      setBody('');
      setErrorMsg('');
      setSubmittedId(null);
      setSubmitting(false);
    }
  }, [open]);

  const titleTrimmed = title.trim();
  const bodyTrimmed = body.trim();
  const isValid =
    !!category &&
    titleTrimmed.length > 0 &&
    titleTrimmed.length <= TITLE_MAX &&
    bodyTrimmed.length > 0 &&
    bodyTrimmed.length <= BODY_MAX;

  const handleSubmit = async () => {
    if (!isValid || submitting || !category) return;
    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await submitFeedback({
        category,
        title: titleTrimmed,
        body: bodyTrimmed,
      });
      setSubmittedId(res.id);
    } catch (e) {
      const err = e as Error;
      setErrorMsg(err.message || t('feedback.error.network', { defaultValue: '送信に失敗しました。時間をおいて再度お試しください。' }));
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => onOpenChange(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('feedback.dialog.title', { defaultValue: '要望を送る' })}</DialogTitle>
          <DialogDescription>
            {t('feedback.dialog.description', { defaultValue: '機能改善のご要望・不具合報告をお送りいただけます。個人情報は含めずにご記入ください。' })}
          </DialogDescription>
        </DialogHeader>

        {submittedId !== null ? (
          <div className="space-y-4 py-4">
            <div className="flex items-start gap-3 rounded-md bg-primary/10 border border-primary/30 p-3">
              <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium text-foreground">
                  {t('feedback.success.title', { defaultValue: '送信しました' })}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('feedback.success.message', { defaultValue: 'ご要望ありがとうございます。担当者が確認いたします。' })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('feedback.success.idLabel', { defaultValue: '受付 ID' })}: #{submittedId}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>
                {t('feedback.success.close', { defaultValue: '閉じる' })}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* カテゴリ */}
            <div className="space-y-1.5">
              <Label htmlFor="feedback-category">
                {t('feedback.field.category.label', { defaultValue: 'カテゴリ' })}
              </Label>
              <Select
                value={category}
                onValueChange={(v) => setCategory(v as FeedbackCategory)}
                disabled={submitting}
              >
                <SelectTrigger id="feedback-category">
                  <SelectValue placeholder={t('feedback.field.category.placeholder', { defaultValue: 'カテゴリを選択...' })} />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {t(`feedback.field.category.options.${c}`, { defaultValue: c })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* タイトル */}
            <div className="space-y-1.5">
              <Label htmlFor="feedback-title">
                {t('feedback.field.title.label', { defaultValue: 'タイトル' })}
              </Label>
              <Input
                id="feedback-title"
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
                placeholder={t('feedback.field.title.placeholder', { defaultValue: '要望の概要を一行で' })}
                maxLength={TITLE_MAX}
                disabled={submitting}
              />
              <p className="text-xs text-muted-foreground text-right">
                {title.length} / {TITLE_MAX}
              </p>
            </div>

            {/* 本文 */}
            <div className="space-y-1.5">
              <Label htmlFor="feedback-body">
                {t('feedback.field.body.label', { defaultValue: '本文' })}
              </Label>
              <Textarea
                id="feedback-body"
                value={body}
                onChange={(e) => setBody(e.target.value.slice(0, BODY_MAX))}
                placeholder={t('feedback.field.body.placeholder', { defaultValue: '具体的な要望・再現手順・期待動作などをお書きください。' })}
                maxLength={BODY_MAX}
                rows={8}
                disabled={submitting}
              />
              <p className="text-xs text-muted-foreground text-right">
                {body.length} / {BODY_MAX}
              </p>
            </div>

            {errorMsg && (
              <div className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/30 p-3">
                <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                <p className="text-sm text-foreground">{errorMsg}</p>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={handleClose} disabled={submitting}>
                {t('feedback.dialog.cancel', { defaultValue: 'キャンセル' })}
              </Button>
              <Button onClick={handleSubmit} disabled={!isValid || submitting}>
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {t('feedback.dialog.submit', { defaultValue: '送信' })}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
