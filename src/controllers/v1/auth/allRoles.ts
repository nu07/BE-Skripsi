import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email dan password wajib diisi.' });
  }

  try {
    // 1. Cek Admin
    const admin = await prisma.admin.findUnique({ where: { email } });
    if (admin) {
      const valid = await bcrypt.compare(password, admin.password);
      if (!valid) {
        return res.status(401).json({ message: 'Password salah.' });
      }

      delete (admin as any).password;
      const valuesAdmin = {
        ...admin,
        role: 'admin',
      };

      const token = jwt.sign(
        { data: valuesAdmin },
        process.env.jwt_secret_key!,
        { expiresIn: 86400 }
      );

      return res.status(200).json({
        message: 'Login berhasil',
        token,
        status: 200,
        data: valuesAdmin,
      });
    }
    

    // 2. Cek Dosen
    const dosen = await prisma.dosen.findUnique({ where: { email } });
    if (dosen) {
      const valid = await bcrypt.compare(password, dosen.password);
      if (!valid) {
        return res.status(401).json({ message: 'Password salah.' });
      }

      delete (dosen as any).password;
      const valuesDosen = {
        ...dosen,
        role: 'dosen',
      };

      const token = jwt.sign(
        { data: valuesDosen },
        process.env.jwt_secret_key!,
        { expiresIn: 86400 }
      );

      return res.status(200).json({
        message: 'Login berhasil',
        token,
        status: 200,
        data: valuesDosen,
      });
    }

    // 3. Cek Mahasiswa
    const mahasiswa = await prisma.mahasiswa.findUnique({ where: { email } });
    if (mahasiswa) {
      const valid = await bcrypt.compare(password, mahasiswa.password);
      if (!valid) {
        return res.status(401).json({ message: 'Password salah.' });
      }

      delete (mahasiswa as any).password;
      const valuesMahasiswa = {
        ...mahasiswa,
        role: 'mahasiswa',
      };

      const token = jwt.sign(
        { data: valuesMahasiswa },
        process.env.jwt_secret_key!,
        { expiresIn: 86400 }
      );

      return res.status(200).json({
        message: 'Login berhasil',
        token,
        status: 200,
        data: valuesMahasiswa,
      });
    }

    return res.status(404).json({ message: 'Pengguna tidak ditemukan.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Login gagal.' });
  }
};
