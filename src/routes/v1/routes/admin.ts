import { Router } from 'express';
import * as AdminController from '@controller/v1/admin/admin';

const router: Router = Router();

// CRUD Mahasiswa
router.get('/mahasiswa', AdminController.getAllMahasiswa); // Tambah Mahasiswa
router.get('/mahasiswa/:id', AdminController.getMahasiswaById); // Getr mahasiswa by id
router.post('/mahasiswa', AdminController.createMahasiswa); // Tambah Mahasiswa
router.put('/mahasiswa/:id', AdminController.updateMahasiswa); // Update Mahasiswa
router.patch('/mahasiswa/:id/kelayakan', AdminController.setKelayakanSkripsi); // Set Kelayakan Skripsi
router.delete('/mahasiswa/:id', AdminController.softDeleteMahasiswa); // Soft Delete Mahasiswa
router.delete('/mahasiswa/:id/force', AdminController.hardDeleteMahasiswa); // Hard Delete Mahasiswa

// ACC / Tolak Skripsi
router.put('/skripsi/:id', AdminController.updateSkripsiByAdmin); // ACC / Tolak Skripsi

// ACC / Tolak Sidang + Atur Penguji
router.put('/sidang/:id', AdminController.updateSidangByAdmin); // ACC / Tolak Sidang + Atur Penguji

// Lihat Catatan Sidang
router.get('/sidang/:id/catatan', AdminController.getCatatanSidang); // Lihat Catatan Sidang

// CRUD Admin
router.post('/admin', AdminController.createAdmin); // Tambah Admin
router.get('/admin', AdminController.getAllAdmins); // Lihat Semua Admin
router.get('/admin/:id', AdminController.getAdminById); // Lihat Admin Berdasarkan ID
router.put('/admin/:id', AdminController.updateAdmin); // Update Admin
router.delete('/admin/force/:id', AdminController.deleteAdmin); // Hapus Admin
router.delete('/admin/:id', AdminController.softDeleteAdmin);

export default router;
