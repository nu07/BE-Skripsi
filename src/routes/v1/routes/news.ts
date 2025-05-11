import { Router } from 'express';
import * as NewsController from '@controller/v1/berita/berita';

const router: Router = Router();

// Route untuk melihat daftar berita
router.get('/news', NewsController.getAllNews);

// Route untuk melihat detail berita berdasarkan ID
router.get('/news/:id', NewsController.getNewsById);

export default router;
