import { Router } from 'express';
import {
  getAllPendaftaran,
  getPendaftaranById,
  createPendaftaran,
  updatePendaftaran,
  deletePendaftaran,
} from '@/controllers/pendaftaranSidang';

const router: Router = Router();

router.get('/', getAllPendaftaran);
router.get('/:id', getPendaftaranById);
router.post('/', createPendaftaran);
router.put('/:id', updatePendaftaran);
router.delete('/:id', deletePendaftaran);

export default router;
