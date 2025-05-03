import { Router } from 'express';
import {
  getAllMahasiswa,
  getMahasiswaById,
  createMahasiswa,
  updateMahasiswa,
  deleteMahasiswa,
} from '@/controllers/mahasiswa';

const router: Router = Router();

router.get('/', getAllMahasiswa);
router.get('/:id', getMahasiswaById);
router.post('/', createMahasiswa);
router.put('/:id', updateMahasiswa);
router.delete('/:id', deleteMahasiswa);

export default router;
