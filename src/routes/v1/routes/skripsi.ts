import { Router } from 'express';
import { getAllSkripsi, getSkripsiById, createSkripsi, updateSkripsi, deleteSkripsi } from '@/controllers/skripsi';

const router: Router = Router();

router.get('/', getAllSkripsi);
router.get('/:id', getSkripsiById);
router.post('/', createSkripsi);
router.put('/:id', updateSkripsi);
router.delete('/:id', deleteSkripsi);

export default router;
