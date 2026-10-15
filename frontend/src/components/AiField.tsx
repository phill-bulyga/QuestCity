import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded'
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack, TextField, Tooltip, Typography } from '@mui/material'
import { type ReactNode, useRef, useState } from 'react'

import { ApiError, api } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { labels } from '../features/generation/brief'

export type FieldValue = string | number | boolean
export type FieldContext = Record<string, string | number | boolean | null>

interface AiFieldProps {
  children: ReactNode
  field: string
  label: string
  scope: 'quest' | 'brief' | 'checkpoint'
  context: FieldContext
  onApply: (value: FieldValue) => void
  disabled?: boolean
}

export function AiField({ children, field, label, scope, context, onApply, disabled = false }: AiFieldProps) {
  const { token } = useAuth()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [instruction, setInstruction] = useState('')
  const [suggestion, setSuggestion] = useState<{ value: FieldValue | null; message: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const controller = useRef<AbortController | null>(null)

  async function generate(extra = instruction) {
    controller.current?.abort()
    const request = new AbortController()
    controller.current = request
    setBusy(true)
    setError(null)
    setSuggestion(null)
    try {
      const result = await api.suggestField(token!, { field, scope, context, instruction: extra }, request.signal)
      if (!request.signal.aborted) setSuggestion(result)
    } catch (reason) {
      if (!request.signal.aborted) setError(reason instanceof ApiError ? reason.message : 'Не удалось получить предложение.')
    } finally {
      if (!request.signal.aborted) setBusy(false)
    }
  }

  function close() {
    controller.current?.abort()
    setBusy(false)
    setOpen(false)
  }

  const displayValue = suggestion?.value === true ? 'Да' : suggestion?.value === false ? 'Нет' :
    field === 'task_type' && typeof suggestion?.value === 'string' ? ({ text: 'Текстовый ответ', single_choice: 'Один вариант', ordering: 'Восстановить порядок', photo: 'Фотозагадка' } as Record<string, string>)[suggestion.value] ?? suggestion.value :
    field in labels && typeof suggestion?.value === 'string' ? (labels[field as keyof typeof labels] as Record<string, string>)[suggestion.value] ?? suggestion.value : suggestion?.value

  return <Box sx={{ minWidth: 0, width: '100%' }}>
    <Stack direction="row" alignItems="flex-start" gap={0.75}>
      <Box sx={{ minWidth: 0, flex: 1 }}>{children}</Box>
      <Tooltip title={`Предложить с помощью ИИ: ${label}`}>
        <span><IconButton size="small" color="primary" aria-label={`Предложить с помощью ИИ: ${label}`} disabled={disabled || !token} onClick={() => { setOpen(true); setInstruction(''); void generate('') }} sx={{ mt: 1, bgcolor: '#f1edfa', borderRadius: '8px', '&:hover': { bgcolor: '#e8ddfa' } }}><AutoAwesomeRoundedIcon fontSize="small" /></IconButton></span>
      </Tooltip>
    </Stack>
    <Dialog open={open} onClose={close} fullWidth maxWidth="tablet" aria-labelledby={`ai-field-${field}`}>
      <DialogTitle id={`ai-field-${field}`}><Stack direction="row" gap={1} alignItems="center"><AutoAwesomeRoundedIcon color="primary" sx={{ flexShrink: 0 }} /><Typography component="span" variant="h3">{label}</Typography></Stack></DialogTitle>
      <DialogContent>
        <Stack spacing={2.5}>
          <Typography color="text.secondary" variant="body2">Помощник учитывает заполненные поля. Предложение появится в форме только после нажатия «Применить».</Typography>
          {busy && <Stack direction="row" alignItems="center" gap={2} role="status"><CircularProgress size={22} /><Typography>Готовим предложение…</Typography></Stack>}
          {error && <Alert severity="error">{error}</Alert>}
          {suggestion && <>
            {suggestion.value !== null && <Box sx={{ p: 2.5, bgcolor: '#f1edfa', borderRadius: '10px', overflowWrap: 'anywhere' }}><Typography sx={{ whiteSpace: 'pre-wrap' }}>{String(displayValue)}</Typography></Box>}
            {suggestion.message && <Alert severity={suggestion.value === null ? 'info' : 'success'}>{suggestion.message}</Alert>}
          </>}
          <TextField label="Пожелание к предложению" placeholder="Например: короче, для детей, в стиле детектива…" multiline minRows={2} value={instruction} disabled={busy} inputProps={{ maxLength: 1000 }} onChange={(event) => setInstruction(event.target.value)} />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3, flexWrap: 'wrap', gap: 1 }}>
        <Button onClick={close} color="inherit">Закрыть</Button>
        <Button onClick={() => void generate()} disabled={busy} startIcon={<AutoAwesomeRoundedIcon />}>Ещё вариант</Button>
        <Button variant="contained" disabled={busy || suggestion?.value === null || !suggestion} onClick={() => { if (suggestion?.value !== null && suggestion?.value !== undefined) onApply(suggestion.value); close() }}>Применить</Button>
      </DialogActions>
    </Dialog>
  </Box>
}
