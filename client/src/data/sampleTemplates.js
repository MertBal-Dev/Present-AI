  import React from 'react';
  import { Rocket, Target, Sparkles } from '../components/common/Icons';

  export const sampleTemplates = [
    {
      id: 'tech-startup',
      title: 'Teknoloji Startup Pitch',
      description: 'Yatırımcıları etkilemek için hazırlanmış modern ve dinamik bir sunum şablonu.',
      theme: 'gradient-blue',
      icon: <Rocket className="w-8 h-8" />,
      preview: { color: 'from-blue-500 to-purple-600', icon: '🚀' },
      data: {
        title: 'Geleceği İnşa Ediyoruz',
        slides: [
          { slideNumber: 1, title: 'Vizyonumuz', layout: 'title-and-content', content: [{ type: 'paragraph', value: 'Yapay zeka destekli çözümlerle iş dünyasını dönüştürüyoruz.' }, { type: 'bullet_list', items: ['🎯 Problem: Geleneksel iş süreçlerinin verimsizliği', '💡 Çözüm: AI destekli otomasyon platformu', '📈 Hedef: 2025\'te 10.000+ aktif kullanıcı'] }], notes: 'Güçlü açılış. Sorunu ve çözümü net bir şekilde vurgula.' },
          { slideNumber: 2, title: 'Pazar Fırsatı', layout: 'title-and-content', content: [{ type: 'bullet_list', items: ['🌍 Global pazar büyüklüğü: $50 milyar', '📊 Yıllık büyüme oranı: %35', '🎯 Hedef müşteri profili: KOBİ\'ler ve kurumsal şirketler'] }], notes: 'İstatistiklerle pazar potansiyelini göster.' }
        ],
        bibliography: ['McKinsey Global Institute (2025). AI Adoption Report', 'TechCrunch: SaaS Market Analysis']
      }
    },
    {
      id: 'marketing-strategy',
      title: 'Pazarlama Stratejisi',
      description: 'Marka bilinirliğini artırmak için kapsamlı bir dijital pazarlama planı.',
      theme: 'sunset',
      icon: <Target className="w-8 h-8" />,
      preview: { color: 'from-orange-500 to-red-600', icon: '🎯' },
      data: {
        title: 'Dijital Pazarlama Stratejisi 2025',
        slides: [{ slideNumber: 1, title: 'Kampanya Hedefleri', layout: 'title-and-content', content: [{ type: 'bullet_list', items: ['🎯 Marka bilinirliğini %50 artırmak', '💰 Sosyal medya ROI\'sini optimize etmek', '📱 Mobil dönüşüm oranını iyileştirmek'] }], notes: 'KPI\'ları net bir şekilde tanımla.' }],
        bibliography: ['HubSpot (2025). Digital Marketing Trends']
      }
    },
    {
      id: 'education',
      title: 'Eğitim Sunumu',
      description: 'Öğrenciler için interaktif ve görsel açıdan zengin bir eğitim materyali.',
      theme: 'ocean',
      icon: <Sparkles className="w-8 h-8" />,
      preview: { color: 'from-cyan-500 to-blue-600', icon: '📚' },
      data: {
        title: 'Modern Eğitim Teknolojileri',
        slides: [{ slideNumber: 1, title: 'Dijital Öğrenme', layout: 'title-and-content', content: [{ type: 'paragraph', value: '21. yüzyıl becerileri için yeni yaklaşımlar' }, { type: 'bullet_list', items: ['🎮 Oyunlaştırma ile motivasyon', '🤖 Yapay zeka destekli kişiselleştirme', '🌐 Sanal sınıflar ve işbirliği'] }], notes: 'Öğrencilerin dikkatini çekici örnekler kullan.' }],
        bibliography: ['UNESCO (2025). Future of Education Report']
      }
    }
  ];