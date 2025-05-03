import { Router } from 'express';
import { getAllDosen, getDosenById, createDosen, updateDosen, deleteDosen } from '@/controllers/dosen';

const router: Router = Router();

router.get('/', getAllDosen);
router.get('/:id', getDosenById);
router.post('/', createDosen);
router.put('/:id', updateDosen);
router.delete('/:id', deleteDosen);

export default router;
