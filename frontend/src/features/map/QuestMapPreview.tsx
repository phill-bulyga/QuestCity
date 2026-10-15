import ExploreRoundedIcon from '@mui/icons-material/ExploreRounded'
import LocalCafeRoundedIcon from '@mui/icons-material/LocalCafeRounded'
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded'
import { Box, Chip, Stack, Typography } from '@mui/material'

export function QuestMapPreview({ checkpointCount, durationMinutes }: { checkpointCount?: number; durationMinutes?: number }) {
  return (
    <Box
      role="img"
      aria-label="Иллюстрация маршрута. Точные точки откроются по ходу игры"
      sx={{
        position: 'relative',
        minHeight: { mobile: 270, tablet: 360 },
        overflow: 'hidden',
        borderRadius: '10px',
        backgroundColor: '#ece8f3',
        backgroundImage:
          'linear-gradient(30deg, transparent 44%, rgba(255,255,255,.9) 45%, rgba(255,255,255,.9) 52%, transparent 53%), linear-gradient(110deg, transparent 43%, rgba(255,255,255,.8) 44%, rgba(255,255,255,.8) 51%, transparent 52%)',
        backgroundSize: '110px 90px, 150px 130px',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          left: '13%',
          right: '12%',
          top: '53%',
          height: 6,
          borderRadius: '10px',
          bgcolor: 'secondary.main',
          transform: 'rotate(-8deg)',
        }}
      />
      <Box sx={{ position: 'absolute', left: '14%', top: '55%', color: 'primary.main' }}>
        <PlaceRoundedIcon sx={{ fontSize: 42 }} />
      </Box>
      <Box sx={{ position: 'absolute', right: '11%', top: '34%', color: 'primary.main' }}>
        <ExploreRoundedIcon sx={{ fontSize: 42 }} />
      </Box>
      <Box
        sx={{
          position: 'absolute',
          left: '52%',
          top: '28%',
          width: 40,
          height: 40,
          display: 'grid',
          placeItems: 'center',
          border: '3px solid white',
          borderRadius: '50%',
          bgcolor: 'warning.main',
          color: 'white',
          boxShadow: 2,
        }}
      >
        <LocalCafeRoundedIcon fontSize="small" />
      </Box>
      <Stack sx={{ position: 'absolute', left: 16, right: 16, bottom: 16 }} direction="row" justifyContent="space-between">
        <Chip label={checkpointCount === undefined ? 'Городские квесты' : `Точек: ${checkpointCount}`} sx={{ bgcolor: 'white' }} />
        <Chip label={durationMinutes === undefined ? 'С телефона' : `~${durationMinutes} мин`} sx={{ bgcolor: 'white', fontWeight: 700 }} />
      </Stack>
      <Typography
        variant="caption"
        sx={{ position: 'absolute', top: 12, left: 16, right: 16, color: 'text.secondary' }}
      >
        Точные точки открываются по ходу игры
      </Typography>
    </Box>
  )
}
