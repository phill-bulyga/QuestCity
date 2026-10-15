import { Box, Typography } from '@mui/material'
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded'

export function Brand() {
  return (
    <Box display="flex" alignItems="center" gap={1}>
      <Box
        display="grid"
        sx={{ placeItems: 'center', width: 40, height: 40, borderRadius: 3, bgcolor: 'primary.main', color: 'white' }}
      >
        <PlaceRoundedIcon />
      </Box>
      <Typography variant="h3" component="div">
        QuestCity
      </Typography>
    </Box>
  )
}
