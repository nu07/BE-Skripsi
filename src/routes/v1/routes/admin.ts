import { Router } from 'express';
import { getAllAdmin, getAdminById, createAdmin, updateAdmin, deleteAdmin } from '@/controllers/admin';

const router: Router = Router();

router.get('/', getAllAdmin);
router.get('/:id', getAdminById);
router.post('/', createAdmin);
router.put('/:id', updateAdmin);
router.delete('/:id', deleteAdmin);

export default router;
