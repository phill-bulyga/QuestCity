import { Alert, Button, Checkbox, FormControlLabel, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ApiError, api, type Guide } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { AiField } from '../../components/AiField'
import { GuideCard } from './GuideCard'
import { guidePresets } from './guidePresets'

export function GuideEditor({ questId, guide, disabled }: { questId: string; guide: Guide | null; disabled: boolean }) {
  const { token } = useAuth()
  const client = useQueryClient()
  const [enabled, setEnabled] = useState(Boolean(guide))
  const [value, setValue] = useState<Guide>(guide ?? guidePresets.explorer)
  const [saved, setSaved] = useState(false)
  useEffect(() => { setEnabled(Boolean(guide)); setValue(guide ?? guidePresets.explorer) }, [guide])
  const save = useMutation({ mutationFn: () => api.saveGuide(token!, questId, enabled ? value : null), onSuccess: async () => { setSaved(true); await client.invalidateQueries({ queryKey: ['quest-edit', questId] }); await client.invalidateQueries({ queryKey: ['quest', questId] }) } })
  function update(changes: Partial<Guide>) { setSaved(false); setValue((current) => ({ ...current, ...changes })) }
  return <Paper variant="outlined" sx={{ p: { mobile: 2, tablet: 4 } }}>
    <Stack component="form" spacing={2.5} onSubmit={(event) => { event.preventDefault(); save.mutate() }}>
      <Typography component="h2" variant="h2">Персонаж-проводник</Typography>
      <Typography color="text.secondary">Представит приключение, поддержит игрока по пути и попрощается в финале.</Typography>
      <FormControlLabel control={<Checkbox checked={enabled} disabled={disabled || save.isPending} onChange={(event) => { setEnabled(event.target.checked); setSaved(false) }} />} label="Добавить проводника" />
      {enabled && <>
        <TextField select label="Образ персонажа" value={value.persona} disabled={disabled || save.isPending} onChange={(event) => update(guidePresets[event.target.value as Guide['persona']])}>{Object.entries(guidePresets).map(([key, preset]) => <MenuItem key={key} value={key}>{preset.name}</MenuItem>)}</TextField>
        <AiField field="guide_name" label="Имя проводника" scope="quest" context={{ guide_name: value.name, guide_introduction: value.introduction, guide_completion: value.completion }} disabled={disabled || save.isPending} onApply={(result) => update({ name: String(result) })}><TextField label="Имя проводника" required value={value.name} disabled={disabled || save.isPending} inputProps={{ minLength: 2, maxLength: 80 }} onChange={(event) => update({ name: event.target.value })} /></AiField>
        <AiField field="guide_introduction" label="Приветствие" scope="quest" context={{ guide_name: value.name, guide_introduction: value.introduction, guide_completion: value.completion }} disabled={disabled || save.isPending} onApply={(result) => update({ introduction: String(result) })}><TextField label="Приветствие" required multiline minRows={3} value={value.introduction} disabled={disabled || save.isPending} inputProps={{ minLength: 5, maxLength: 1200 }} onChange={(event) => update({ introduction: event.target.value })} /></AiField>
        <AiField field="guide_completion" label="Сообщение в финале" scope="quest" context={{ guide_name: value.name, guide_introduction: value.introduction, guide_completion: value.completion }} disabled={disabled || save.isPending} onApply={(result) => update({ completion: String(result) })}><TextField label="Сообщение в финале" multiline minRows={2} value={value.completion} disabled={disabled || save.isPending} inputProps={{ maxLength: 1200 }} onChange={(event) => update({ completion: event.target.value })} /></AiField>
        <GuideCard guide={value} />
      </>}
      {save.error && <Alert severity="error">{save.error instanceof ApiError ? save.error.message : 'Не удалось сохранить проводника'}</Alert>}
      {saved && <Alert severity="success">Проводник сохранён.</Alert>}
      {!disabled && <Button type="submit" variant="outlined" disabled={save.isPending}>{save.isPending ? 'Сохраняем…' : 'Сохранить проводника'}</Button>}
    </Stack>
  </Paper>
}
