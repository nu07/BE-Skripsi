import { Router } from 'express';
import * as AdminController from '@controller/v1/admin/admin';
import authJwt from '@middleware/authJWT';

const router: Router = Router();

// CRUD Mahasiswa
router.get('/mahasiswa', [authJwt.verifyToken], AdminController.getAllMahasiswa); // Tambah Mahasiswa
router.get('/mahasiswa/:id', [authJwt.verifyToken], AdminController.getMahasiswaById); // Getr mahasiswa by id
router.post('/mahasiswa', [authJwt.verifyToken], AdminController.createMahasiswa); // Tambah Mahasiswa
router.put('/mahasiswa/:id', [authJwt.verifyToken], AdminController.updateMahasiswa); // Update Mahasiswa
router.patch('/mahasiswa/:id/kelayakan', [authJwt.verifyToken], AdminController.setKelayakanSkripsi); // Set Kelayakan Skripsi
router.delete('/mahasiswa/:id', [authJwt.verifyToken], AdminController.softDeleteMahasiswa); // Soft Delete Mahasiswa
router.delete('/mahasiswa/:id/force', [authJwt.verifyToken], AdminController.hardDeleteMahasiswa); // Hard Delete Mahasiswa

// ACC / Tolak Skripsi
router.put('/skripsi/:id', [authJwt.verifyToken], AdminController.updateSkripsiByAdmin); // ACC / Tolak Skripsi
router.get('/skripsi/', [authJwt.verifyToken], AdminController.getAllSkripsi); // ACC / Tolak Skripsi
router.post('/set-pembimbing', AdminController.setPembimbing);
// ACC / Tolak Sidang + Atur Penguji
router.put('/sidang/:id', [authJwt.verifyToken], AdminController.updateSidangByAdmin); // ACC / Tolak Sidang + Atur Penguji

// Lihat Catatan Sidang
router.get('/sidang/:id/catatan', [authJwt.verifyToken], AdminController.getCatatanSidang); // Lihat Catatan Sidang

// CRUD Admin
router.post('/admin', [authJwt.verifyToken], AdminController.createAdmin); // Tambah Admin
router.get('/admin', [authJwt.verifyToken], AdminController.getAllAdmins); // Lihat Semua Admin
router.get('/admin/:id', [authJwt.verifyToken], AdminController.getAdminById); // Lihat Admin Berdasarkan ID
router.put('/admin/:id', [authJwt.verifyToken], AdminController.updateAdmin); // Update Admin
router.delete('/admin/force/:id', [authJwt.verifyToken], AdminController.deleteAdmin); // Hapus Admin
router.delete('/admin/:id', [authJwt.verifyToken], AdminController.softDeleteAdmin);

// approval
router.get('/approval-history', [authJwt.verifyToken], AdminController.getApprovalHistories);
router.get('/approval-history/:id', [authJwt.verifyToken], AdminController.getApprovalHistoryById);

// berita
router.post('/news', [authJwt.verifyToken], AdminController.createNews);
router.get('/news', AdminController.getAllNews);
router.get('/news/:id', [authJwt.verifyToken], AdminController.getNewsById);
router.put('/news/:id', [authJwt.verifyToken], AdminController.updateNews);
router.delete('/news/:id', [authJwt.verifyToken], AdminController.deleteNews);

// jadwal sidang

router.post('/jadwal', [authJwt.verifyToken], AdminController.createJadwalSidang);
router.get('/jadwal', [authJwt.verifyToken], AdminController.getAllJadwalSidang);
router.get('/jadwal/:id', [authJwt.verifyToken], AdminController.getJadwalSidangById);
router.put('/jadwal/:id', [authJwt.verifyToken], AdminController.updateJadwalSidang);
router.delete('/jadwal/:id', [authJwt.verifyToken], AdminController.deleteJadwalSidang);

// . Validasi dan Otentikasi
router.post('/login', AdminController.loginAdmin);

export default router;
