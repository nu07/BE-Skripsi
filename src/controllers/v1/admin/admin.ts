import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// 1. Tambah Mahasiswa
export const createMahasiswa = async (req: Request, res: Response) => {
  try {
    const { nim, nama, email, password } = req.body;

    // Validasi jika nim atau email sudah ada
    const existingMahasiswa = await prisma.mahasiswa.findUnique({
      where: { nim },
    });

    if (existingMahasiswa) {
      return res.status(400).json({ message: 'NIM sudah terdaftar.' });
    }

    const existingEmail = await prisma.mahasiswa.findUnique({
      where: { email },
    });

    if (existingEmail) {
      return res.status(400).json({ message: 'Email sudah terdaftar.' });
    }

    // Hash password menggunakan bcrypt
    const hashedPassword = await bcrypt.hash(password, 10);

    // Membuat mahasiswa baru
    const mahasiswa = await prisma.mahasiswa.create({
      data: {
        nim,
        nama,
        email,
        password: hashedPassword,
      },
    });

    return res.status(201).json(mahasiswa);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
};

export const getAllMahasiswa = async (req: Request, res: Response) => {
  try {
    const mahasiswa = await prisma.mahasiswa.findMany(); // Mendapatkan semua admin
    res.status(200).json(mahasiswa);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch admins' });
  }
};

export const getMahasiswaById = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const mahasiswa = await prisma.mahasiswa.findUnique({
      where: { id },
    });

    if (!mahasiswa) {
      return res.status(404).json({ error: 'mahasiswa not found' });
    }

    res.status(200).json(mahasiswa);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch mahasiswa' });
  }
};

// 2. Update Mahasiswa
export const updateMahasiswa = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { nama, email, password } = req.body;

    // Update mahasiswa
    const mahasiswa = await prisma.mahasiswa.update({
      where: { id },
      data: {
        nama,
        email,
        password: password ? await bcrypt.hash(password, 10) : undefined,
      },
    });

    return res.status(200).json(mahasiswa);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
};

// 3. Set Kelayakan Skripsi
export const setKelayakanSkripsi = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isEligibleForSkripsi } = req.body;

    // Update kelayakan skripsi
    const mahasiswa = await prisma.mahasiswa.update({
      where: { id: id },
      data: {
        isEligibleForSkripsi,
      },
    });

    return res.status(200).json(mahasiswa);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
};

// 4. Soft Delete Mahasiswa
export const softDeleteMahasiswa = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const mahasiswa = await prisma.mahasiswa.update({
      where: { id },
      data: {
        isEligibleForSkripsi: false,
        isEligibleForSidang: false,
        deletedAt: new Date(),
      },
    });

    return res.status(200).json({ res: mahasiswa, message: 'Mahasiswa berhasil dihapus sementara.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
};

// 5. Hard Delete Mahasiswa
export const hardDeleteMahasiswa = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Hard delete mahasiswa
    await prisma.mahasiswa.delete({
      where: { id },
    });

    return res.status(200).json({ message: 'Mahasiswa berhasil dihapus permanen.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
};

// 6. ACC / Tolak Skripsi
export const updateSkripsiByAdmin = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, catatan } = req.body;

    // Update status skripsi
    const skripsi = await prisma.skripsi.update({
      where: { id },
      data: {
        catatanPembayaran: catatan,
        status,
      },
    });

    return res.status(200).json(skripsi);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
};

// 7. ACC / Tolak Sidang + Atur Penguji
export const updateSidangByAdmin = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, id_penguji, tanggal_sidang } = req.body;

    // Update status sidang dan atur penguji
    const sidang = await prisma.pendaftaranSidang.update({
      where: { id: id },
      data: {
        status,
        id_penguji: id_penguji ? id_penguji : null,
        tanggal_sidang,
      },
    });

    return res.status(200).json(sidang);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
};

// 8. Lihat Catatan Sidang
export const getCatatanSidang = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Ambil catatan hasil sidang
    const sidang = await prisma.pendaftaranSidang.findUnique({
      where: { id },
      include: {
        penguji: true,
      },
    });

    return res.status(200).json(sidang);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
};

export const createAdmin = async (req: Request, res: Response) => {
  const { username, password, nama } = req.body;

  try {
    // Hash password yang diterima dari request
    const hashedPassword = await bcrypt.hash(password, 10);

    // Buat admin baru di database
    const admin = await prisma.admin.create({
      data: {
        username,
        password: hashedPassword,
        nama,
      },
    });

    res.status(201).json(admin); // Return admin yang baru dibuat
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create admin' });
  }
};

// Lihat Semua Admin
export const getAllAdmins = async (req: Request, res: Response) => {
  try {
    const admins = await prisma.admin.findMany(); // Mendapatkan semua admin
    res.status(200).json(admins);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch admins' });
  }
};

// Lihat Admin Berdasarkan ID
export const getAdminById = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const admin = await prisma.admin.findUnique({
      where: { id },
    });

    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    res.status(200).json(admin);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch admin' });
  }
};

// Update Admin
export const updateAdmin = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { username, password, nama } = req.body;

  try {
    // Hash password yang baru
    const hashedPassword = await bcrypt.hash(password, 10);

    const updatedAdmin = await prisma.admin.update({
      where: { id },
      data: {
        username,
        password: hashedPassword,
        nama,
      },
    });

    res.status(200).json(updatedAdmin); // Return admin yang sudah diperbarui
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update admin' });
  }
};

// Hapus Admin
export const deleteAdmin = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const deletedAdmin = await prisma.admin.delete({
      where: { id },
    });

    res.status(200).json(deletedAdmin); // Return admin yang sudah dihapus
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete admin' });
  }
};

export const softDeleteAdmin = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    // Update admin with 'deletedAt' timestamp to mark as soft deleted
    const admin = await prisma.admin.update({
      where: { id },
      data: {
        deletedAt: new Date(), // Set deletedAt to current timestamp
      },
    });

    return res.status(200).json({
      message: 'Admin successfully soft deleted',
      admin,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Error soft deleting admin',
      error: error.message,
    });
  }
};
