import { Router } from 'express';
import * as auth from '@controller/v1/auth/allRoles';
// import authJwt from '@middleware/authJWT';

const router: Router = Router();

// Login dosen
router.post('/login', auth.login);

export default router;
