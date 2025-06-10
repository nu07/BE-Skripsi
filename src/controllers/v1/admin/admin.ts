import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// 1. Tambah Mahasiswa
export const createMahasiswa = async (req: Request, res: Response) => {
  try {
    const { nim, nama, email, password, isEligibleForSkripsi = true } = req.body;

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
        isEligibleForSkripsi,
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

export const getAllSkripsi = async (req: Request, res: Response) => {
  try {
    const skripsi = await prisma.skripsi.findMany(); // Mendapatkan semua admin
    res.status(200).json(skripsi);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch admins' });
  }
};

// 7. ACC / Tolak Sidang + Atur Penguji
export const updateSidangByAdmin = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, id_penguji1, id_penguji2, tanggal_sidang } = req.body;

    // Update status sidang dan atur penguji
    const sidang = await prisma.pendaftaranSidang.update({
      where: { id: id },
      data: {
        status,
        id_penguji1: id_penguji1 ? id_penguji1 : null,
        id_penguji2: id_penguji2 ? id_penguji2 : null,
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
        penguji1: true,
        penguji2: true,
      },
    });

    return res.status(200).json(sidang);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
};

export const createAdmin = async (req: Request, res: Response) => {
  const { email, password, nama } = req.body;

  try {
    // Hash password yang diterima dari request
    const hashedPassword = await bcrypt.hash(password, 10);

    // Buat admin baru di database
    const admin = await prisma.admin.create({
      data: {
        email,
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
  const { email, password, nama } = req.body;

  try {
    // Hash password yang baru
    const hashedPassword = await bcrypt.hash(password, 10);

    const updatedAdmin = await prisma.admin.update({
      where: { id },
      data: {
        email,
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

export const getApprovalHistories = async (req: Request, res: Response) => {
  try {
    const approvalHistories = await prisma.approvalHistory.findMany();
    return res.status(200).json(approvalHistories);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
};

export const getApprovalHistoryById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const approvalHistory = await prisma.approvalHistory.findUnique({
      where: { id },
    });

    if (!approvalHistory) {
      return res.status(404).json({ message: 'Approval history tidak ditemukan' });
    }

    return res.status(200).json(approvalHistory);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
};

export const createNews = async (req: Request, res: Response) => {
  try {
    const { title, content } = req.body;
    const userId = req.userId;

    const news = await prisma.news.create({
      data: {
        title,
        content,
        id_admin: userId,
      },
    });

    return res.status(201).json(news);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
};

export const getAllNews = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [news, total] = await Promise.all([
      prisma.news.findMany({
        skip,
        take: limit,
        include: {
          admin: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.news.count(),
    ]);

    return res.status(200).json({
      data: news,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalItems: total,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
};

export const getNewsById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const news = await prisma.news.findUnique({
      where: { id },
    });

    if (!news) {
      return res.status(404).json({ message: 'Berita tidak ditemukan' });
    }

    return res.status(200).json(news);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
};

export const updateNews = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;

    const updatedNews = await prisma.news.update({
      where: { id },
      data: {
        title,
        content,
      },
    });

    return res.status(200).json(updatedNews);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
};

export const deleteNews = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.news.delete({
      where: { id },
    });

    return res.status(200).json({ message: 'Berita berhasil dihapus' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
};

// export const createJadwalSidang = async (req: Request, res: Response) => {
//   try {
//     const { tanggal, ruangan } = req.body;

//     const jadwal = await prisma.jadwalSidang.create({
//       data: {
//         tanggal,
//         ruangan,
//       },
//     });

//     return res.status(201).json(jadwal);
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({ message: 'Terjadi kesalahan server.' });
//   }
// };

// export const getAllJadwalSidang = async (req: Request, res: Response) => {
//   try {
//     const jadwals = await prisma.pendaftaranSidang.findMany();
//     return res.status(200).json(jadwals);
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({ message: 'Terjadi kesalahan server.' });
//   }
// };

// export const getJadwalSidangById = async (req: Request, res: Response) => {
//   try {
//     const { id } = req.params;
//     const jadwal = await prisma.pendaftaranSidang.findUnique({
//       where: { id },
//     });

//     if (!jadwal) {
//       return res.status(404).json({ message: 'Jadwal Sidang tidak ditemukan' });
//     }

//     return res.status(200).json(jadwal);
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({ message: 'Terjadi kesalahan server.' });
//   }
// };

// export const updateJadwalSidang = async (req: Request, res: Response) => {
//   try {
//     const { id } = req.params;
//     const { tanggal, ruangan } = req.body;

//     const updatedJadwal = await prisma.pendaftaranSidang.update({
//       where: { id },
//       data: {
//         tanggal_sidang: tanggal,
//       },
//     });

//     return res.status(200).json(updatedJadwal);
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({ message: 'Terjadi kesalahan server.' });
//   }
// };

// export const deleteJadwalSidang = async (req: Request, res: Response) => {
//   try {
//     const { id } = req.params;

//     await prisma.jadwalSidang.delete({
//       where: { id },
//     });

//     return res.status(200).json({ message: 'Jadwal Sidang berhasil dihapus' });
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({ message: 'Terjadi kesalahan server.' });
//   }
// };

export const loginAdmin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const admin = await prisma.admin.findUnique({
      where: { email },
    });

    if (!admin) {
      return res.status(404).json({ message: 'Admin tidak ditemukan' });
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password);

    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Password salah' });
    }

    const expired = 86400; // 24 Jam
    const token = jwt.sign({ data: admin }, process.env.jwt_secret_key, {
      expiresIn: expired, // 24 Jam
    });

    delete admin.password;
    const valuesAdmin = {
      ...admin,
      role: 'admin',
    };

    return res.status(200).json({
      message: 'Login berhasil',
      token: token,
      status: 200,
      data: valuesAdmin,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: 'Terjadi kesalahan server.',
      status: 404,
    });
  }
};

export const setPembimbing = async (req: Request, res: Response) => {
  const { idSkripsi, idPembimbing1, idPembimbing2 } = req.body;

  if (!idSkripsi || !idPembimbing1) {
    return res.status(400).json({ message: 'ID Skripsi dan Pembimbing 1 wajib diisi.' });
  }

  try {
    const skripsi = await prisma.skripsi.update({
      where: { id: idSkripsi },
      data: {
        id_pembimbing1: idPembimbing1,
        id_pembimbing2: idPembimbing2 || null, // Pembimbing 2 opsional
      },
    });

    res.status(200).json({
      message: 'Pembimbing berhasil ditetapkan.',
      data: skripsi,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Gagal menetapkan pembimbing.' });
  }
};
