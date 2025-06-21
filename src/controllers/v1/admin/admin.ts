import { Request, Response } from 'express';
import { Prisma, PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import ExcelJS from 'exceljs';

const prisma = new PrismaClient();

// 1. Tambah Mahasiswa
export const createMahasiswa = async (req: Request, res: Response) => {
  try {
    const data = req.body;

    // Terima 1 objek atau array of mahasiswa
    const mahasiswaList = Array.isArray(data) ? data : [data];

    const insertedMahasiswa: any[] = [];
    const skippedMahasiswa: any[] = [];

    for (const mhs of mahasiswaList) {
      const { nim, nama, email, password, isEligibleForSkripsi = true } = mhs;

      // Validasi awal
      if (!nim || !nama || !email || !password) {
        skippedMahasiswa.push({
          nim,
          email,
          reason: 'Data tidak lengkap',
        });
        continue;
      }

      // Cek apakah NIM/email sudah ada di sistem
      const [existingNIM, existingEmailMhs, existingEmailDosen, existingEmailAdmin] = await Promise.all([
        prisma.mahasiswa.findUnique({ where: { nim: String(nim) } }),
        prisma.mahasiswa.findUnique({ where: { email } }),
        prisma.dosen.findUnique({ where: { email } }),
        prisma.admin.findUnique({ where: { email } }),
      ]);

      if (existingNIM) {
        skippedMahasiswa.push({
          nim,
          email,
          reason: 'NIM sudah terdaftar',
        });
        continue;
      }

      if (existingEmailMhs || existingEmailDosen || existingEmailAdmin) {
        skippedMahasiswa.push({
          nim,
          email,
          reason: 'Email sudah terdaftar di sistem',
        });
        continue;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Simpan data
      const newMahasiswa = await prisma.mahasiswa.create({
        data: {
          nim: String(nim),
          nama,
          email,
          password: hashedPassword,
          isEligibleForSkripsi,
        },
      });

      insertedMahasiswa.push(newMahasiswa);
    }

    return res.status(201).json({
      message: `Berhasil menambahkan ${insertedMahasiswa.length} mahasiswa.`,
      inserted: insertedMahasiswa,
      skipped: skippedMahasiswa,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Terjadi kesalahan server.', error });
  }
};

export const getAllMahasiswa = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || '';
    const showDeleted = req.query.showDeleted === 'true';
    const skip = (page - 1) * limit;

    const whereClause: Prisma.MahasiswaWhereInput = {};

    // Jika showDeleted = false, filter hanya yang belum dihapus
    if (!showDeleted) {
      whereClause.deletedAt = null;
    }

    // Jika ada query pencarian
    if (search) {
      whereClause.OR = [
        { nama: { contains: search, mode: 'insensitive' } },
        { nim: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Ambil data mahasiswa dan total count untuk pagination
    const [mahasiswaList, total] = await Promise.all([
      prisma.mahasiswa.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { nama: 'asc' },
        select: {
          id: true,
          nama: true,
          nim: true,
          email: true,
          deletedAt: true,
          isEligibleForSkripsi: true,
          isEligibleForSidang: true,
          catatanSkripsi: true,
          skripsi: true,
          pendaftarans: true,
          approvalSkripsis: true,
          // password tidak disertakan
        },
      }),
      prisma.mahasiswa.count({
        where: whereClause,
      }),
    ]);

    return res.status(200).json({
      message: 'Daftar mahasiswa berhasil diambil',
      data: mahasiswaList,
      pagination: {
        total,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        limit,
      },
    });
  } catch (error) {
    console.error('Error getAllMahasiswa:', error);
    return res.status(500).json({ message: 'Gagal mengambil daftar mahasiswa' });
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
    const { nama, email, password, isEligibleForSkripsi } = req.body;

    // Update mahasiswa
    const mahasiswa = await prisma.mahasiswa.update({
      where: { id },
      data: {
        nama,
        email,
        password: password ? await bcrypt.hash(password, 10) : undefined,
        isEligibleForSkripsi,
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
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || '';
    const showDeleted = req.query.showDeleted === 'true';
    const statusFilter = req.query.status as string | undefined; // "pending", "gagal", "sukses"
    const skip = (page - 1) * limit;

    const whereClause: Prisma.SkripsiWhereInput = {};

    if (!showDeleted) {
      whereClause.deletedAt = null;
    }

    if (search) {
      whereClause.OR = [
        { judul: { contains: search, mode: 'insensitive' } },
        { mahasiswa: { nama: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (statusFilter && ['pending', 'gagal', 'sukses'].includes(statusFilter)) {
      whereClause.status = statusFilter;
    }

    const [skripsiList, total] = await Promise.all([
      prisma.skripsi.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: [
          {
            status: 'asc', // secara default "pending" < "gagal" < "sukses"
          },
          {
            mahasiswa: { nama: 'asc' },
          },
        ],
        include: {
          mahasiswa: true,
          pembimbing1: true,
          pembimbing2: true,
        },
      }),
      prisma.skripsi.count({ where: whereClause }),
    ]);

    return res.status(200).json({
      message: 'Daftar skripsi berhasil diambil',
      data: skripsiList,
      pagination: {
        total,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        limit,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Gagal mengambil daftar skripsi' });
  }
};

// 7. ACC / Tolak Sidang + Atur Penguji
export const updateSidangByAdmin = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, id_penguji1, id_penguji2, tanggal_sidang } = req.body;

    // Update pendaftaran sidang
    const updatedSidang = await prisma.pendaftaranSidang.update({
      where: { id },
      data: {
        status,
        id_penguji1: id_penguji1 || null,
        id_penguji2: id_penguji2 || null,
        tanggal_sidang,
      },
      include: {
        mahasiswa: { select: { id: true } }, // Ambil id mahasiswa
      },
    });

    const id_mahasiswa = updatedSidang.mahasiswa.id;

    // Cek status approval penguji di ApprovalSkripsi
    const approvals = await prisma.approvalSkripsi.findMany({
      where: {
        id_mahasiswa: id_mahasiswa,
        status: true,
        OR: [{ id_dosen: id_penguji1 }, { id_dosen: id_penguji2 }],
      },
    });

    const penguji1Acc = approvals.some((a) => a.id_dosen === id_penguji1);
    const penguji2Acc = approvals.some((a) => a.id_dosen === id_penguji2);

    if (penguji1Acc && penguji2Acc) {
      await prisma.mahasiswa.update({
        where: { id: id_mahasiswa },
        data: { isEligibleForSidang: true },
      });
    }

    return res.status(200).json({ message: 'Data sidang berhasil diperbarui.' });
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
    // Validasi email tidak boleh kosong
    if (!email || !password || !nama) {
      return res.status(400).json({ message: 'Email, password, dan nama wajib diisi.' });
    }

    // Cek apakah email sudah digunakan oleh admin, dosen, atau mahasiswa
    const existingEmail =
      (await prisma.admin.findUnique({ where: { email } })) ||
      (await prisma.dosen.findUnique({ where: { email } })) ||
      (await prisma.mahasiswa.findUnique({ where: { email } }));

    if (existingEmail) {
      return res.status(400).json({ message: 'Email sudah digunakan oleh pengguna lain.' });
    }

    // Hash password sebelum disimpan
    const hashedPassword = await bcrypt.hash(password, 10);

    // Buat admin baru
    const admin = await prisma.admin.create({
      data: {
        email,
        password: hashedPassword,
        nama,
      },
      select: {
        id: true,
        email: true,
        nama: true,
        deletedAt: true,
      },
    });

    return res.status(201).json({
      message: 'Admin berhasil dibuat.',
      data: admin,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Gagal membuat admin.' });
  }
};

// Lihat Semua Admin
export const getAllAdmins = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || '';
    const showDeleted = req.query.showDeleted === 'true';
    const skip = (page - 1) * limit;

    const whereClause: Prisma.AdminWhereInput = {};

    // Filter deleted
    if (!showDeleted) {
      whereClause.deletedAt = null;
    }

    // Filter search
    if (search) {
      whereClause.OR = [
        { nama: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [adminList, total] = await Promise.all([
      prisma.admin.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { nama: 'asc' },
        select: {
          id: true,
          nama: true,
          email: true,
          deletedAt: true,
        },
      }),
      prisma.admin.count({ where: whereClause }),
    ]);

    return res.status(200).json({
      message: 'Daftar admin berhasil diambil',
      data: adminList,
      pagination: {
        total,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        limit,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Gagal mengambil daftar admin' });
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
  const { email, password, nama, restore } = req.body;

  try {
    // Cek apakah email sudah digunakan oleh admin lain
    const existingAdmin = await prisma.admin.findFirst({
      where: {
        email,
        NOT: { id }, // kecuali yang sedang diupdate
      },
    });
    if (existingAdmin) {
      return res.status(400).json({ message: 'Email sudah digunakan oleh admin lain.' });
    }

    // Cek email di dosen
    const existingDosen = await prisma.dosen.findUnique({ where: { email } });
    if (existingDosen) {
      return res.status(400).json({ message: 'Email sudah digunakan oleh dosen.' });
    }

    // Cek email di mahasiswa
    const existingMahasiswa = await prisma.mahasiswa.findUnique({ where: { email } });
    if (existingMahasiswa) {
      return res.status(400).json({ message: 'Email sudah digunakan oleh mahasiswa.' });
    }

    const dataToUpdate: any = {
      email,
      nama,
    };

    // Jika password tidak kosong, hash dan masukkan ke data update
    if (password && password.trim() !== '') {
      const hashedPassword = await bcrypt.hash(password, 10);
      dataToUpdate.password = hashedPassword;
    }

    // Jika restore === true, maka hapus soft delete
    if (restore === true) {
      dataToUpdate.deletedAt = null;
    }

    const updatedAdmin = await prisma.admin.update({
      where: { id },
      data: dataToUpdate,
    });

    res.status(200).json({
      message: 'Admin berhasil diperbarui.',
      data: {
        id: updatedAdmin.id,
        email: updatedAdmin.email,
        nama: updatedAdmin.nama,
        deletedAt: updatedAdmin.deletedAt,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Gagal memperbarui admin.' });
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
    const search = (req.query.search as string) || '';

    const skip = (page - 1) * limit;

    const whereClause: Prisma.NewsWhereInput = search
      ? {
          OR: [
            {
              title: {
                contains: search,
                mode: 'insensitive',
              },
            },
            {
              content: {
                contains: search,
                mode: 'insensitive',
              },
            },
          ],
        }
      : {};

    const [news, total] = await Promise.all([
      prisma.news.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        where: whereClause,
        include: {
          admin: true,
        },
      }),
      prisma.news.count({ where: whereClause }),
    ]);

    return res.status(200).json({
      data: news,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
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
      include: {
        admin: true,
      },
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

export const getAllPendaftaranSidang = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || '';
    const showDeleted = req.query.showDeleted === 'true';
    const skip = (page - 1) * limit;

    const whereClause: Prisma.PendaftaranSidangWhereInput = {};

    if (!showDeleted) {
      whereClause.deletedAt = null;
    }

    if (search) {
      whereClause.OR = [
        { status: { contains: search, mode: 'insensitive' } },
        { catatan: { contains: search, mode: 'insensitive' } },
        {
          mahasiswa: {
            nama: { contains: search, mode: 'insensitive' },
          },
        },
      ];
    }

    const [rawList, total] = await Promise.all([
      prisma.pendaftaranSidang.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: {
          mahasiswa: true,
          skripsi: true,
          penguji1: true,
          penguji2: true,
        },
      }),
      prisma.pendaftaranSidang.count({ where: whereClause }),
    ]);

    // Urutkan berdasarkan status: unfinished → ongoing → finished
    const getStatusOrder = (status: string) => {
      if (status === 'unfinished') return 0;
      if (status === 'ongoing') return 1;
      if (status === 'finished') return 2;
      return 3; // fallback jika status tidak dikenal
    };

    const sortedList = rawList.sort((a, b) => getStatusOrder(a.status) - getStatusOrder(b.status));

    return res.status(200).json({
      message: 'Daftar pendaftaran sidang berhasil diambil',
      data: sortedList,
      pagination: {
        total,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        limit,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Terjadi kesalahan saat mengambil data.' });
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

export const downloadMahasiswaReport = async (req: Request, res: Response) => {
  try {
    const mahasiswaList = await prisma.mahasiswa.findMany({
      orderBy: {
        nama: 'asc', // urut berdasarkan nama
      },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Laporan Mahasiswa');

    // Header kolom
    worksheet.columns = [
      { header: 'No', key: 'no', width: 5 },
      { header: 'NIM', key: 'nim', width: 20 },
      { header: 'Nama', key: 'nama', width: 30 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Kelayakan Skripsi', key: 'skripsi', width: 20 },
      { header: 'Kelayakan Sidang', key: 'sidang', width: 20 },
    ];

    // Data
    mahasiswaList.forEach((mhs, index) => {
      worksheet.addRow({
        no: index + 1,
        nim: mhs.nim,
        nama: mhs.nama,
        email: mhs.email,
        skripsi: mhs.isEligibleForSkripsi ? 'Ya' : 'Tidak',
        sidang: mhs.isEligibleForSidang ? 'Ya' : 'Tidak',
      });
    });

    // Header response untuk download file
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=laporan-mahasiswa.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Gagal mengunduh laporan mahasiswa.',
      error: error instanceof Error ? error.message : error,
    });
  }
};

export const downloadAdminReport = async (req: Request, res: Response) => {
  try {
    const adminList = await prisma.admin.findMany({
      orderBy: {
        nama: 'asc',
      },
      select: {
        id: true,
        nama: true,
        email: true,
      },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Laporan Admin');

    worksheet.columns = [
      { header: 'No', key: 'no', width: 5 },
      { header: 'ID', key: 'id', width: 30 },
      { header: 'Nama', key: 'nama', width: 30 },
      { header: 'Email', key: 'email', width: 30 },
    ];

    adminList.forEach((admin, index) => {
      worksheet.addRow({
        no: index + 1,
        id: admin.id,
        nama: admin.nama,
        email: admin.email,
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=laporan-admin.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: 'Gagal mengunduh laporan admin.',
      error: error instanceof Error ? error.message : error,
    });
  }
};

export const downloadPembayaranSkripsiReport = async (req: Request, res: Response) => {
  const fullUrl = req.protocol + '://' + req.get('host');
  try {
    const pembayaranList = await prisma.skripsi.findMany({
      include: {
        mahasiswa: {
          select: {
            nama: true,
            nim: true,
          },
        },
      },
      orderBy: {
        mahasiswa: {
          nama: 'asc',
        },
      },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Pembayaran Skripsi');

    worksheet.columns = [
      { header: 'No', key: 'no', width: 5 },
      { header: 'NIM', key: 'nim', width: 15 },
      { header: 'Nama', key: 'nama', width: 30 },
      { header: 'Judul Skripsi', key: 'judul', width: 40 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Catatan', key: 'catatan', width: 30 },
      { header: 'Bukti Pembayaran', key: 'bukti', width: 40 },
    ];

    pembayaranList.forEach((item, index) => {
      worksheet.addRow({
        no: index + 1,
        nim: item.mahasiswa?.nim || '-',
        nama: item.mahasiswa?.nama || '-',
        judul: item.judul,
        status: item.status || '-',
        catatan: item.catatanPembayaran || '-',
        bukti: fullUrl + '/v1/' + item.buktiPembayaran || '-',
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=laporan-pembayaran-skripsi.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: 'Gagal mengunduh laporan pembayaran skripsi.',
      error: error instanceof Error ? error.message : error,
    });
  }
};

export const downloadLaporanSidang = async (req: Request, res: Response) => {
  try {
    const sidangList = await prisma.pendaftaranSidang.findMany({
      include: {
        mahasiswa: {
          select: { nama: true, nim: true },
        },
        skripsi: {
          select: { judul: true },
        },
        penguji1: {
          select: { nama: true },
        },
        penguji2: {
          select: { nama: true },
        },
      },
      orderBy: {
        tanggal_sidang: 'asc',
      },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Laporan Sidang');

    worksheet.columns = [
      { header: 'No', key: 'no', width: 5 },
      { header: 'NIM', key: 'nim', width: 15 },
      { header: 'Nama Mahasiswa', key: 'nama', width: 30 },
      { header: 'Judul Skripsi', key: 'judul', width: 40 },
      { header: 'Tanggal Sidang', key: 'tanggal', width: 20 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Penguji 1', key: 'penguji1', width: 30 },
      { header: 'Penguji 2', key: 'penguji2', width: 30 },
      { header: 'Catatan Penguji 1', key: 'catatan1', width: 30 },
      { header: 'Catatan Penguji 2', key: 'catatan2', width: 30 },
    ];

    sidangList.forEach((item, index) => {
      worksheet.addRow({
        no: index + 1,
        nim: item.mahasiswa?.nim || '-',
        nama: item.mahasiswa?.nama || '-',
        judul: item.skripsi?.judul || '-',
        tanggal: item.tanggal_sidang ? new Date(item.tanggal_sidang).toLocaleDateString('id-ID') : '-',
        status: item.status || '-',
        penguji1: item.penguji1?.nama || '-',
        penguji2: item.penguji2?.nama || '-',
        catatan1: item.catatan_penguji1 || '-',
        catatan2: item.catatan_penguji2 || '-',
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=laporan-sidang.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: 'Gagal mengunduh laporan sidang.',
      error: error instanceof Error ? error.message : error,
    });
  }
};

export const downloadLaporanDosen = async (req: Request, res: Response) => {
  try {
    const dosenList = await prisma.dosen.findMany({
      orderBy: {
        nama: 'asc',
      },
      select: {
        nidn: true,
        nama: true,
        email: true,
        deletedAt: true,
      },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Laporan Dosen');

    worksheet.columns = [
      { header: 'No', key: 'no', width: 5 },
      { header: 'NIDN', key: 'nidn', width: 15 },
      { header: 'Nama Dosen', key: 'nama', width: 30 },
      { header: 'Email', key: 'email', width: 30 },
    ];

    dosenList.forEach((dosen, index) => {
      worksheet.addRow({
        no: index + 1,
        nidn: dosen.nidn,
        nama: dosen.nama,
        email: dosen.email,
        deleted: dosen.deletedAt,
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=laporan-dosen.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: 'Gagal mengunduh laporan dosen.',
      error: error instanceof Error ? error.message : error,
    });
  }
};
