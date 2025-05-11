import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Mendapatkan semua berita
export const getAllNews = async (req: Request, res: Response) => {
  try {
    const news = await prisma.news.findMany({
      orderBy: {
        createdAt: 'desc', // Menampilkan berita terbaru di atas
      },
    });

    res.status(200).json(news);
  } catch (error) {
    console.error(error);
    res.status(500).send('Terjadi kesalahan pada server.');
  }
};

// Mendapatkan berita berdasarkan ID
export const getNewsById = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const news = await prisma.news.findUnique({
      where: { id },
    });

    if (!news) {
      return res.status(404).send('Berita tidak ditemukan.');
    }

    res.status(200).json(news);
  } catch (error) {
    console.error(error);
    res.status(500).send('Terjadi kesalahan pada server.');
  }
};
