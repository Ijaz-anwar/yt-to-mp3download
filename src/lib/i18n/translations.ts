export type Locale = "en" | "es" | "fr" | "de" | "pt";

export const SUPPORTED_LOCALES: {
  code: Locale;
  label: string;
  nativeName: string;
  flag: string;
}[] = [
  { code: "en", label: "EN", nativeName: "English", flag: "🇺🇸" },
  { code: "es", label: "ES", nativeName: "Español", flag: "🇪🇸" },
  { code: "fr", label: "FR", nativeName: "Français", flag: "🇫🇷" },
  { code: "de", label: "DE", nativeName: "Deutsch", flag: "🇩🇪" },
  { code: "pt", label: "PT", nativeName: "Português", flag: "🇵🇹" },
];

export function isValidLocale(lang: string): lang is Locale {
  return ["en", "es", "fr", "de", "pt"].includes(lang);
}

export function getLocalePath(locale: Locale, subPath = "/"): string {
  const cleanSub = subPath.startsWith("/") ? subPath : `/${subPath}`;
  if (locale === "en") {
    return cleanSub;
  }
  return cleanSub === "/" ? `/${locale}` : `/${locale}${cleanSub}`;
}

export interface TranslationDictionary {
  meta: {
    title: string;
    description: string;
  };
  header: {
    subtitle: string;
    home: string;
    howItWorks: string;
    faq: string;
    contact: string;
    languageLabel: string;
  };
  hero: {
    badge: string;
    title: string;
    subtitle: string;
    pillMp3: string;
    pillMp4: string;
    pillFast: string;
    inputLabel: string;
    inputPlaceholder: string;
    pasteButton: string;
    clearUrl: string;
    convertButton: string;
    convertAriaLabel: string;
    analyzingLabel: string;
    analyzingSublabel: string;
    emptyUrlError: string;
    clipboardUnsupported: string;
    clipboardEmpty: string;
    clipboardBlocked: string;
  };
  downloadCard: {
    readyBadge: string;
    convertAnother: string;
    durationLabel: string;
    selectFormatHint: string;
    downloadMp3: string;
    audioBadge: string;
    mp3Quality: string;
    convertingAudio: string;
    downloadMp4: string;
    videoBadge: string;
    mp4Quality: string;
    downloadingVideo: string;
    extractingMp3Progress: string;
    mergingMp4Progress: string;
    downloadStartedTitle: string;
    manualSavePrompt: string;
    manualSaveLink: string;
    convertAnotherVideo: string;
    downloadErrorTitle: string;
    retryButton: string;
    cancelButton: string;
  };
  howItWorks: {
    badge: string;
    title: string;
    subtitle: string;
    fastEasy: string;
    steps: {
      title: string;
      description: string;
    }[];
    ctaTitle: string;
    ctaSubtitle: string;
    ctaButton: string;
  };
  formats: {
    badge: string;
    title: string;
    subtitle: string;
    mp3Name: string;
    mp3Quality: string;
    mp3Tag: string;
    mp3Desc: string;
    mp4Name: string;
    mp4Quality: string;
    mp4Tag: string;
    mp4Desc: string;
  };
  whyChoose: {
    badge: string;
    title: string;
    subtitle: string;
    readyBadge: string;
    items: {
      title: string;
      description: string;
    }[];
  };
  faq: {
    badge: string;
    title: string;
    subtitle: string;
    items: {
      question: string;
      answer: string;
    }[];
    stillHaveQuestions: string;
    reachOutText: string;
    contactUsBtn: string;
  };
  privacy: {
    title: string;
    subtitle: string;
    sections: {
      title: string;
      body: string;
    }[];
  };
  terms: {
    title: string;
    subtitle: string;
    sections: {
      title: string;
      body: string;
    }[];
  };
  contact: {
    title: string;
    subtitle: string;
    cardTitle: string;
    cardBody: string;
  };
  footer: {
    quickLinks: string;
    youtubeDownloader: string;
    howItWorks: string;
    faq: string;
    privacyPolicy: string;
    termsOfService: string;
    contact: string;
    copyrightTagline: string;
  };
}

export const TRANSLATIONS: Record<Locale, TranslationDictionary> = {
  en: {
    meta: {
      title: "MediaNest — YouTube to MP3 & MP4 Downloader",
      description:
        "Paste any YouTube video URL to convert and download high-quality MP3 audio or MP4 video instantly.",
    },
    header: {
      subtitle: "YouTube MP3 & MP4 Downloader",
      home: "Home",
      howItWorks: "How It Works",
      faq: "FAQ",
      contact: "Contact",
      languageLabel: "Language",
    },
    hero: {
      badge: "YouTube to MP3 & MP4 Downloader",
      title: "Download YouTube Videos as MP3 or MP4",
      subtitle:
        "Paste any YouTube video URL below, click Convert, and choose MP3 audio or MP4 video to download instantly.",
      pillMp3: "MP3 Audio (320 kbps)",
      pillMp4: "MP4 Video (Full HD)",
      pillFast: "Fast & Free Download",
      inputLabel: "Paste YouTube Video URL",
      inputPlaceholder: "Paste YouTube video URL here (e.g. https://www.youtube.com/watch?v=...)",
      pasteButton: "Paste",
      clearUrl: "Clear URL",
      convertButton: "Convert",
      convertAriaLabel: "Convert YouTube Video",
      analyzingLabel: "Preparing your MP3 and MP4 download options...",
      analyzingSublabel: "Fetching YouTube video details",
      emptyUrlError: "Please paste a valid YouTube video URL.",
      clipboardUnsupported: "Clipboard API is not supported in this browser. Please use Ctrl+V to paste.",
      clipboardEmpty: "Clipboard is empty or contains non-text content.",
      clipboardBlocked: "Browser clipboard permission was blocked. Please press Ctrl+V or right-click into the input to paste.",
    },
    downloadCard: {
      readyBadge: "Ready to Download",
      convertAnother: "Convert Another",
      durationLabel: "Duration",
      selectFormatHint:
        "Select your preferred download format below. MP3 extracts the highest fidelity audio track; MP4 downloads the complete high definition video.",
      downloadMp3: "Download MP3",
      audioBadge: "Audio",
      mp3Quality: "320 kbps Studio Quality Audio",
      convertingAudio: "Converting audio...",
      downloadMp4: "Download MP4",
      videoBadge: "Video",
      mp4Quality: "Full HD 1080p / 720p Video",
      downloadingVideo: "Downloading video...",
      extractingMp3Progress: "Extracting audio and encoding to MP3...",
      mergingMp4Progress: "Merging high quality video streams into MP4...",
      downloadStartedTitle: "download has started!",
      manualSavePrompt: "Download didn't start automatically?",
      manualSaveLink: "Click here to save",
      convertAnotherVideo: "Convert Another Video",
      downloadErrorTitle: "Download Error",
      retryButton: "Retry Download",
      cancelButton: "Cancel",
    },
    howItWorks: {
      badge: "Simple 3-Step Process",
      title: "How to Download YouTube Videos",
      subtitle: "Save any YouTube video as MP3 audio or MP4 video in just a few clicks.",
      fastEasy: "Fast & Easy",
      steps: [
        {
          title: "Paste YouTube Video URL",
          description:
            "Copy the link of any YouTube video you want to save and paste it into the input field above.",
        },
        {
          title: "Click Convert",
          description:
            "Press the Convert button to fetch the video details and prepare your two download options.",
        },
        {
          title: "Download MP3 or MP4",
          description:
            "Click either the Download MP3 button for audio or the Download MP4 button for full video to save the file directly to your device.",
        },
      ],
      ctaTitle: "Ready to convert a YouTube video?",
      ctaSubtitle: "Paste your YouTube link on the homepage to get your MP3 and MP4 download options.",
      ctaButton: "Go to Downloader",
    },
    formats: {
      badge: "Two Simple Options",
      title: "Available Download Formats",
      subtitle:
        "Every YouTube video link gives you two direct download choices: MP3 for audio or MP4 for video.",
      mp3Name: "MP3 Audio Download",
      mp3Quality: "320 kbps High Quality",
      mp3Tag: "Audio Option",
      mp3Desc:
        "Extract clean, high-bitrate MP3 audio from any YouTube video. Ideal for music, podcasts, lectures, and offline listening on any phone or computer.",
      mp4Name: "MP4 Video Download",
      mp4Quality: "Full HD 1080p / 720p",
      mp4Tag: "Video Option",
      mp4Desc:
        "Download the full YouTube video with both video and audio in standard MP4 format. Works seamlessly on all mobile devices, tablets, and desktops.",
    },
    whyChoose: {
      badge: "Fast & Simple",
      title: "Why Use MediaNest?",
      subtitle: "Designed to be the simplest way to download YouTube videos as MP3 or MP4.",
      readyBadge: "Ready to Use",
      items: [
        {
          title: "One-Field Simplicity",
          description:
            "No complicated settings or menus. Simply paste your YouTube video link into the single input field and click Convert.",
        },
        {
          title: "High-Quality MP3 Audio",
          description:
            "Convert any YouTube video into a 320 kbps MP3 audio file with a single click for offline listening.",
        },
        {
          title: "Full HD MP4 Video",
          description:
            "Save complete YouTube videos in standard MP4 format with crisp 1080p or 720p video and clear sound.",
        },
        {
          title: "No Registration or Proxy",
          description:
            "Free to use directly in your browser with no sign-ups, no software installation, and no proxy required.",
        },
      ],
    },
    faq: {
      badge: "Got Questions?",
      title: "Frequently Asked Questions",
      subtitle: "Everything you need to know about downloading YouTube videos in MP3 and MP4 formats.",
      items: [
        {
          question: "How do I download a YouTube video as MP3 or MP4?",
          answer:
            "Simply copy the YouTube video link, paste it into the input box on our homepage, and click Convert. Once the video information loads, click either 'Download MP3' for audio or 'Download MP4' for video.",
        },
        {
          question: "What download formats are available?",
          answer:
            "We provide two direct options for every YouTube video: MP3 (320 kbps high-quality audio) and MP4 (Full HD 1080p / 720p video with sound).",
        },
        {
          question: "Do I need a proxy or account to download YouTube videos?",
          answer:
            "No. You do not need any proxy, VPN, software installation, or user account. Just paste your YouTube URL and download directly in your browser.",
        },
        {
          question: "Is MediaNest free to use?",
          answer:
            "Yes, MediaNest is completely free. You can convert and download YouTube videos to MP3 or MP4 without any registration or hidden fees.",
        },
        {
          question: "Are downloaded files stored on your server?",
          answer:
            "No. Temporary files generated during MP3 or MP4 conversion are automatically deleted from the server shortly after your download finishes.",
        },
      ],
      stillHaveQuestions: "Still have a question?",
      reachOutText: "Reach out to us through our contact page.",
      contactUsBtn: "Contact Us",
    },
    privacy: {
      title: "Privacy Policy",
      subtitle:
        "MediaNest provides a simple service where you paste a YouTube video URL and download MP3 audio or MP4 video without creating an account or sharing personal data.",
      sections: [
        {
          title: "1. No Registration or Personal Data",
          body: "We do not require you to sign up, log in, or provide your name or email address to use our YouTube to MP3 and MP4 downloader.",
        },
        {
          title: "2. Temporary File Processing",
          body: "When you paste a YouTube video link and choose MP3 or MP4, the converted file is stored temporarily on our server solely to deliver your download and is automatically deleted after 15 minutes.",
        },
        {
          title: "3. Contact",
          body: "If you have any questions about our privacy practices, please reach out via our Contact Page.",
        },
      ],
    },
    terms: {
      title: "Terms of Service",
      subtitle:
        "Please review the simple terms governing the use of MediaNest for converting and downloading YouTube videos in MP3 and MP4 formats.",
      sections: [
        {
          title: "1. Service Description",
          body: "MediaNest allows users to paste a YouTube video URL into a single input field and download the media in two formats: MP3 audio or MP4 video.",
        },
        {
          title: "2. Personal & Fair Use",
          body: "Users are responsible for ensuring their downloads comply with applicable copyright laws and personal use guidelines. Do not use automated bots to overload the conversion server.",
        },
        {
          title: "3. Contact",
          body: "For any questions regarding these terms, please visit our Contact Page.",
        },
      ],
    },
    contact: {
      title: "Contact Us",
      subtitle: "Need help converting a YouTube video link to MP3 or MP4? Reach out to our team below.",
      cardTitle: "Email Support",
      cardBody:
        "If a YouTube video URL fails to convert or you have any feedback about our MP3 and MP4 download options, send us an email:",
    },
    footer: {
      quickLinks: "Quick Links",
      youtubeDownloader: "YouTube Downloader",
      howItWorks: "How It Works",
      faq: "FAQ",
      privacyPolicy: "Privacy Policy",
      termsOfService: "Terms of Service",
      contact: "Contact",
      copyrightTagline: "Fast YouTube to MP3 & MP4 Downloader.",
    },
  },
  es: {
    meta: {
      title: "MediaNest — Descargador de YouTube a MP3 y MP4",
      description:
        "Pega cualquier enlace de video de YouTube para convertir y descargar audio MP3 de alta calidad o video MP4 al instante.",
    },
    header: {
      subtitle: "Descargador de YouTube MP3 y MP4",
      home: "Inicio",
      howItWorks: "Cómo Funciona",
      faq: "Preguntas Frecuentes",
      contact: "Contacto",
      languageLabel: "Idioma",
    },
    hero: {
      badge: "Descargador de YouTube a MP3 y MP4",
      title: "Descargar Videos de YouTube en MP3 o MP4",
      subtitle:
        "Pega cualquier enlace de YouTube abajo, haz clic en Convertir y elige audio MP3 o video MP4 para descargar al instante.",
      pillMp3: "Audio MP3 (320 kbps)",
      pillMp4: "Video MP4 (Full HD)",
      pillFast: "Descarga Rápida y Gratis",
      inputLabel: "Pegar URL del Video de YouTube",
      inputPlaceholder: "Pega la URL del video de YouTube aquí (ej. https://www.youtube.com/watch?v=...)",
      pasteButton: "Pegar",
      clearUrl: "Borrar URL",
      convertButton: "Convertir",
      convertAriaLabel: "Convertir Video de YouTube",
      analyzingLabel: "Preparando tus opciones de descarga MP3 y MP4...",
      analyzingSublabel: "Obteniendo detalles del video de YouTube",
      emptyUrlError: "Por favor, pega una URL válida de video de YouTube.",
      clipboardUnsupported: "El portapapeles no está soportado en este navegador. Usa Ctrl+V para pegar.",
      clipboardEmpty: "El portapapeles está vacío.",
      clipboardBlocked: "Permiso del portapapeles bloqueado. Presiona Ctrl+V para pegar.",
    },
    downloadCard: {
      readyBadge: "Listo para Descargar",
      convertAnother: "Convertir Otro",
      durationLabel: "Duración",
      selectFormatHint:
        "Selecciona tu formato de descarga preferido abajo. MP3 extrae la pista de audio en máxima calidad; MP4 descarga el video completo en alta definición.",
      downloadMp3: "Descargar MP3",
      audioBadge: "Audio",
      mp3Quality: "Audio Calidad Estudio 320 kbps",
      convertingAudio: "Convirtiendo audio...",
      downloadMp4: "Descargar MP4",
      videoBadge: "Video",
      mp4Quality: "Video Full HD 1080p / 720p",
      downloadingVideo: "Descargando video...",
      extractingMp3Progress: "Extrayendo audio y codificando a MP3...",
      mergingMp4Progress: "Procesando flujo de video en MP4...",
      downloadStartedTitle: "¡la descarga ha comenzado!",
      manualSavePrompt: "¿La descarga no comenzó automáticamente?",
      manualSaveLink: "Haz clic aquí para guardar",
      convertAnotherVideo: "Convertir Otro Video",
      downloadErrorTitle: "Error de Descarga",
      retryButton: "Reintentar Descarga",
      cancelButton: "Cancelar",
    },
    howItWorks: {
      badge: "Proceso Simple en 3 Pasos",
      title: "Cómo Descargar Videos de YouTube",
      subtitle: "Guarda cualquier video de YouTube como audio MP3 o video MP4 en pocos clics.",
      fastEasy: "Rápido y Fácil",
      steps: [
        {
          title: "Pega la URL de YouTube",
          description:
            "Copia el enlace del video de YouTube que deseas guardar y pégalo en el campo de entrada de arriba.",
        },
        {
          title: "Haz Clic en Convertir",
          description:
            "Presiona el botón Convertir para obtener los detalles del video y mostrar las dos opciones de descarga.",
        },
        {
          title: "Descarga MP3 o MP4",
          description:
            "Elige el botón Descargar MP3 para audio o Descargar MP4 para el video completo y guárdalo en tu dispositivo.",
        },
      ],
      ctaTitle: "¿Listo para convertir un video de YouTube?",
      ctaSubtitle: "Pega tu enlace de YouTube en la página de inicio para obtener las opciones MP3 y MP4.",
      ctaButton: "Ir al Descargador",
    },
    formats: {
      badge: "Dos Opciones Simples",
      title: "Formatos de Descarga Disponibles",
      subtitle:
        "Cada enlace de YouTube te ofrece dos opciones directas de descarga: MP3 para audio o MP4 para video.",
      mp3Name: "Descarga de Audio MP3",
      mp3Quality: "Alta Calidad 320 kbps",
      mp3Tag: "Opción de Audio",
      mp3Desc:
        "Extrae audio MP3 limpio y de alta calidad de cualquier video de YouTube. Ideal para música, podcasts y escuchar sin conexión.",
      mp4Name: "Descarga de Video MP4",
      mp4Quality: "Full HD 1080p / 720p",
      mp4Tag: "Opción de Video",
      mp4Desc:
        "Descarga el video completo de YouTube con imagen y sonido en formato estándar MP4 compatible con todos los dispositivos.",
    },
    whyChoose: {
      badge: "Rápido y Sencillo",
      title: "¿Por Qué Usar MediaNest?",
      subtitle: "Diseñado para ser la forma más sencilla de descargar videos de YouTube en MP3 o MP4.",
      readyBadge: "Listo para Usar",
      items: [
        {
          title: "Un Solo Campo",
          description:
            "Sin configuraciones complicadas. Simplemente pega el enlace de tu video de YouTube y haz clic en Convertir.",
        },
        {
          title: "Audio MP3 de Alta Calidad",
          description:
            "Convierte cualquier video de YouTube en un archivo MP3 de 320 kbps con un solo clic.",
        },
        {
          title: "Video MP4 Full HD",
          description:
            "Guarda videos completos de YouTube en formato MP4 con calidad nítida de 1080p o 720p.",
        },
        {
          title: "Sin Registro ni Proxy",
          description:
            "Gratis directamente en tu navegador, sin cuentas de usuario, sin instalar programas y sin proxy.",
        },
      ],
    },
    faq: {
      badge: "¿Tienes Preguntas?",
      title: "Preguntas Frecuentes",
      subtitle: "Todo lo que necesitas saber sobre cómo descargar videos de YouTube en formatos MP3 y MP4.",
      items: [
        {
          question: "¿Cómo descargo un video de YouTube en MP3 o MP4?",
          answer:
            "Copia el enlace del video de YouTube, pégalo en el cuadro de entrada en nuestra página de inicio y haz clic en Convertir. Luego elige 'Descargar MP3' o 'Descargar MP4'.",
        },
        {
          question: "¿Qué formatos de descarga están disponibles?",
          answer:
            "Ofrecemos dos opciones directas para cada video de YouTube: MP3 (audio de 320 kbps) y MP4 (video Full HD 1080p / 720p con sonido).",
        },
        {
          question: "¿Necesito un proxy o cuenta para descargar videos de YouTube?",
          answer:
            "No. No necesitas ningún proxy, VPN, programa ni cuenta. Solo pega la URL de YouTube y descarga directamente en tu navegador.",
        },
        {
          question: "¿Es gratis usar MediaNest?",
          answer:
            "Sí, MediaNest es completamente gratuito. Puedes convertir y descargar videos de YouTube a MP3 o MP4 sin cargos ocultos.",
        },
        {
          question: "¿Se guardan los archivos descargados en el servidor?",
          answer:
            "No. Los archivos temporales generados durante la conversión a MP3 o MP4 se eliminan automáticamente poco después de finalizar tu descarga.",
        },
      ],
      stillHaveQuestions: "¿Aún tienes alguna pregunta?",
      reachOutText: "Contáctanos a través de nuestra página de soporte.",
      contactUsBtn: "Contáctanos",
    },
    privacy: {
      title: "Política de Privacidad",
      subtitle:
        "MediaNest ofrece un servicio sencillo donde pegas la URL de un video de YouTube y descargas audio MP3 o video MP4 sin crear una cuenta ni compartir datos personales.",
      sections: [
        {
          title: "1. Sin Registro ni Datos Personales",
          body: "No solicitamos registro, inicio de sesión, nombre ni correo electrónico para usar nuestro descargador de YouTube a MP3 y MP4.",
        },
        {
          title: "2. Procesamiento Temporal de Archivos",
          body: "Cuando pegas un enlace de YouTube y eliges MP3 o MP4, el archivo convertido se almacena temporalmente solo para entregar tu descarga y se elimina automáticamente después de 15 minutos.",
        },
        {
          title: "3. Contacto",
          body: "Si tienes preguntas sobre nuestra privacidad, escríbenos a través de nuestra página de Contacto.",
        },
      ],
    },
    terms: {
      title: "Términos de Servicio",
      subtitle:
        "Revisa los términos de uso de MediaNest para convertir y descargar videos de YouTube en formatos MP3 y MP4.",
      sections: [
        {
          title: "1. Descripción del Servicio",
          body: "MediaNest permite pegar la URL de un video de YouTube en un único campo y descargar el archivo en dos formatos: audio MP3 o video MP4.",
        },
        {
          title: "2. Uso Personal",
          body: "Los usuarios son responsables de cumplir con las leyes de derechos de autor aplicables. No se permite el uso de bots automatizados.",
        },
        {
          title: "3. Contacto",
          body: "Para cualquier consulta sobre estos términos, visita nuestra página de Contacto.",
        },
      ],
    },
    contact: {
      title: "Contáctanos",
      subtitle: "¿Necesitas ayuda para convertir un enlace de YouTube a MP3 o MP4? Escríbenos a continuación.",
      cardTitle: "Soporte por Correo",
      cardBody:
        "Si una URL de YouTube falla al convertirse o tienes comentarios sobre nuestras opciones de descarga MP3 y MP4, envíanos un correo:",
    },
    footer: {
      quickLinks: "Enlaces Rápidos",
      youtubeDownloader: "Descargador de YouTube",
      howItWorks: "Cómo Funciona",
      faq: "Preguntas Frecuentes",
      privacyPolicy: "Política de Privacidad",
      termsOfService: "Términos de Servicio",
      contact: "Contacto",
      copyrightTagline: "Descargador Rápido de YouTube a MP3 y MP4.",
    },
  },
  fr: {
    meta: {
      title: "MediaNest — Téléchargeur YouTube vers MP3 et MP4",
      description:
        "Collez n'importe quel lien vidéo YouTube pour convertir et télécharger instantanément de l'audio MP3 haute qualité ou une vidéo MP4.",
    },
    header: {
      subtitle: "Téléchargeur YouTube MP3 et MP4",
      home: "Accueil",
      howItWorks: "Comment Ça Marche",
      faq: "FAQ",
      contact: "Contact",
      languageLabel: "Langue",
    },
    hero: {
      badge: "Téléchargeur YouTube vers MP3 et MP4",
      title: "Télécharger des Vidéos YouTube en MP3 ou MP4",
      subtitle:
        "Collez n'importe quelle URL vidéo YouTube ci-dessous, cliquez sur Convertir et choisissez MP3 ou MP4 pour télécharger instantanément.",
      pillMp3: "Audio MP3 (320 kbps)",
      pillMp4: "Vidéo MP4 (Full HD)",
      pillFast: "Téléchargement Rapide et Gratuit",
      inputLabel: "Coller l'URL de la Vidéo YouTube",
      inputPlaceholder: "Collez l'URL de la vidéo YouTube ici (ex. https://www.youtube.com/watch?v=...)",
      pasteButton: "Coller",
      clearUrl: "Effacer l'URL",
      convertButton: "Convertir",
      convertAriaLabel: "Convertir la Vidéo YouTube",
      analyzingLabel: "Préparation de vos options de téléchargement MP3 et MP4...",
      analyzingSublabel: "Récupération des détails de la vidéo YouTube",
      emptyUrlError: "Veuillez coller une URL vidéo YouTube valide.",
      clipboardUnsupported: "Le presse-papiers n'est pas pris en charge. Utilisez Ctrl+V pour coller.",
      clipboardEmpty: "Le presse-papiers est vide.",
      clipboardBlocked: "Autorisation du presse-papiers bloquée. Appuyez sur Ctrl+V pour coller.",
    },
    downloadCard: {
      readyBadge: "Prêt à Télécharger",
      convertAnother: "Convertir une Autre",
      durationLabel: "Durée",
      selectFormatHint:
        "Sélectionnez votre format de téléchargement ci-dessous. MP3 extrait la piste audio en haute fidélité ; MP4 télécharge la vidéo complète en haute définition.",
      downloadMp3: "Télécharger MP3",
      audioBadge: "Audio",
      mp3Quality: "Audio Qualité Studio 320 kbps",
      convertingAudio: "Conversion audio...",
      downloadMp4: "Télécharger MP4",
      videoBadge: "Vidéo",
      mp4Quality: "Vidéo Full HD 1080p / 720p",
      downloadingVideo: "Téléchargement vidéo...",
      extractingMp3Progress: "Extraction audio et encodage en MP3...",
      mergingMp4Progress: "Préparation de la vidéo en MP4...",
      downloadStartedTitle: "le téléchargement a commencé !",
      manualSavePrompt: "Le téléchargement n'a pas démarré automatiquement ?",
      manualSaveLink: "Cliquez ici pour enregistrer",
      convertAnotherVideo: "Convertir une Autre Vidéo",
      downloadErrorTitle: "Erreur de Téléchargement",
      retryButton: "Réessayer",
      cancelButton: "Annuler",
    },
    howItWorks: {
      badge: "Processus Simple en 3 Étapes",
      title: "Comment Télécharger des Vidéos YouTube",
      subtitle: "Enregistrez n'importe quelle vidéo YouTube en audio MP3 ou vidéo MP4 en quelques clics.",
      fastEasy: "Rapide et Facile",
      steps: [
        {
          title: "Collez l'URL YouTube",
          description:
            "Copiez le lien de la vidéo YouTube que vous souhaitez enregistrer et collez-le dans le champ ci-dessus.",
        },
        {
          title: "Cliquez sur Convertir",
          description:
            "Appuyez sur le bouton Convertir pour charger la vidéo et afficher vos deux options de téléchargement.",
        },
        {
          title: "Téléchargez en MP3 ou MP4",
          description:
            "Cliquez sur Télécharger MP3 pour l'audio ou Télécharger MP4 pour la vidéo complète afin d'enregistrer le fichier sur votre appareil.",
        },
      ],
      ctaTitle: "Prêt à convertir une vidéo YouTube ?",
      ctaSubtitle: "Collez votre lien YouTube sur la page d'accueil pour obtenir vos options MP3 et MP4.",
      ctaButton: "Aller au Téléchargeur",
    },
    formats: {
      badge: "Deux Options Simples",
      title: "Formats de Téléchargement Disponibles",
      subtitle:
        "Chaque lien vidéo YouTube vous offre deux choix directs : MP3 pour l'audio ou MP4 pour la vidéo.",
      mp3Name: "Téléchargement Audio MP3",
      mp3Quality: "Haute Qualité 320 kbps",
      mp3Tag: "Option Audio",
      mp3Desc:
        "Extrayez un son MP3 haute qualité à partir de n'importe quelle vidéo YouTube. Idéal pour la musique, les podcasts et l'écoute hors ligne.",
      mp4Name: "Téléchargement Vidéo MP4",
      mp4Quality: "Full HD 1080p / 720p",
      mp4Tag: "Option Vidéo",
      mp4Desc:
        "Téléchargez la vidéo YouTube complète avec image et son au format standard MP4, compatible avec tous les appareils.",
    },
    whyChoose: {
      badge: "Rapide et Simple",
      title: "Pourquoi Utiliser MediaNest ?",
      subtitle: "Conçu pour être le moyen le plus simple de télécharger des vidéos YouTube en MP3 ou MP4.",
      readyBadge: "Prêt à l'Emploi",
      items: [
        {
          title: "Un Seul Champ",
          description:
            "Aucun réglage compliqué. Collez simplement le lien de votre vidéo YouTube et cliquez sur Convertir.",
        },
        {
          title: "Audio MP3 Haute Qualité",
          description:
            "Convertissez n'importe quelle vidéo YouTube en fichier audio MP3 320 kbps en un seul clic.",
        },
        {
          title: "Vidéo MP4 Full HD",
          description:
            "Enregistrez des vidéos YouTube complètes au format MP4 avec une qualité nette en 1080p ou 720p.",
        },
        {
          title: "Sans Inscription ni Proxy",
          description:
            "Gratuit directement dans votre navigateur, sans compte utilisateur, sans logiciel et sans proxy requis.",
        },
      ],
    },
    faq: {
      badge: "Des Questions ?",
      title: "Questions Fréquemment Posées",
      subtitle: "Tout ce que vous devez savoir sur le téléchargement de vidéos YouTube en MP3 et MP4.",
      items: [
        {
          question: "Comment télécharger une vidéo YouTube en MP3 ou MP4 ?",
          answer:
            "Copiez simplement le lien de la vidéo YouTube, collez-le dans le champ sur notre page d'accueil et cliquez sur Convertir. Choisissez ensuite 'Télécharger MP3' ou 'Télécharger MP4'.",
        },
        {
          question: "Quels sont les formats de téléchargement disponibles ?",
          answer:
            "Nous proposons deux options directes pour chaque vidéo YouTube : MP3 (audio haute qualité 320 kbps) et MP4 (vidéo Full HD 1080p / 720p avec son).",
        },
        {
          question: "Ai-je besoin d'un proxy ou d'un compte pour télécharger ?",
          answer:
            "Non. Vous n'avez besoin d'aucun proxy, VPN, logiciel ou compte. Collez simplement votre URL YouTube et téléchargez directement dans votre navigateur.",
        },
        {
          question: "MediaNest est-il gratuit ?",
          answer:
            "Oui, MediaNest est entièrement gratuit. Vous pouvez convertir et télécharger des vidéos YouTube en MP3 ou MP4 sans inscription.",
        },
        {
          question: "Les fichiers téléchargés sont-ils conservés sur le serveur ?",
          answer:
            "Non. Les fichiers temporaires générés lors de la conversion MP3 ou MP4 sont automatiquement supprimés peu après votre téléchargement.",
        },
      ],
      stillHaveQuestions: "Vous avez encore une question ?",
      reachOutText: "Contactez-nous via notre page de contact.",
      contactUsBtn: "Nous Contacter",
    },
    privacy: {
      title: "Politique de Confidentialité",
      subtitle:
        "MediaNest propose un service simple où vous collez une URL vidéo YouTube et téléchargez un fichier MP3 ou MP4 sans créer de compte ni partager de données personnelles.",
      sections: [
        {
          title: "1. Aucune Inscription ni Donnée Personnelle",
          body: "Nous ne vous demandons pas de créer un compte ni de fournir votre nom ou adresse e-mail pour utiliser notre téléchargeur YouTube MP3 et MP4.",
        },
        {
          title: "2. Traitement Temporaire des Fichiers",
          body: "Lorsque vous collez un lien YouTube et choisissez MP3 ou MP4, le fichier converti est stocké temporairement uniquement pour permettre votre téléchargement, puis supprimé automatiquement après 15 minutes.",
        },
        {
          title: "3. Contact",
          body: "Pour toute question concernant notre politique de confidentialité, veuillez consulter notre page Contact.",
        },
      ],
    },
    terms: {
      title: "Conditions d'Utilisation",
      subtitle:
        "Veuillez consulter les conditions régissant l'utilisation de MediaNest pour convertir et télécharger des vidéos YouTube en MP3 et MP4.",
      sections: [
        {
          title: "1. Description du Service",
          body: "MediaNest permet aux utilisateurs de coller l'URL d'une vidéo YouTube dans un champ unique et de télécharger le média en deux formats : audio MP3 ou vidéo MP4.",
        },
        {
          title: "2. Usage Personnel",
          body: "Les utilisateurs sont tenus de respecter les lois sur le droit d'auteur applicables. L'utilisation de robots automatisés est interdite.",
        },
        {
          title: "3. Contact",
          body: "Pour toute question concernant ces conditions, veuillez visiter notre page Contact.",
        },
      ],
    },
    contact: {
      title: "Nous Contacter",
      subtitle: "Besoin d'aide pour convertir un lien vidéo YouTube en MP3 ou MP4 ? Écrivez-nous ci-dessous.",
      cardTitle: "Support par E-mail",
      cardBody:
        "Si une URL vidéo YouTube ne parvient pas à être convertie ou si vous avez des commentaires sur nos options MP3 et MP4, envoyez-nous un e-mail :",
    },
    footer: {
      quickLinks: "Liens Rapides",
      youtubeDownloader: "Téléchargeur YouTube",
      howItWorks: "Comment Ça Marche",
      faq: "FAQ",
      privacyPolicy: "Politique de Confidentialité",
      termsOfService: "Conditions d'Utilisation",
      contact: "Contact",
      copyrightTagline: "Téléchargeur Rapide YouTube vers MP3 et MP4.",
    },
  },
  de: {
    meta: {
      title: "MediaNest — YouTube zu MP3 & MP4 Downloader",
      description:
        "Fügen Sie eine beliebige YouTube-Video-URL ein, um sofort hochwertiges MP3-Audio oder MP4-Video zu konvertieren und herunterzuladen.",
    },
    header: {
      subtitle: "YouTube MP3 & MP4 Downloader",
      home: "Startseite",
      howItWorks: "So Funktioniert's",
      faq: "FAQ",
      contact: "Kontakt",
      languageLabel: "Sprache",
    },
    hero: {
      badge: "YouTube zu MP3 & MP4 Downloader",
      title: "YouTube-Videos als MP3 oder MP4 Herunterladen",
      subtitle:
        "Fügen Sie unten eine YouTube-Video-URL ein, klicken Sie auf Konvertieren und wählen Sie MP3-Audio oder MP4-Video zum sofortigen Download.",
      pillMp3: "MP3-Audio (320 kbps)",
      pillMp4: "MP4-Video (Full HD)",
      pillFast: "Schnell & Kostenlos",
      inputLabel: "YouTube-Video-URL Einfügen",
      inputPlaceholder: "YouTube-Video-URL hier einfügen (z. B. https://www.youtube.com/watch?v=...)",
      pasteButton: "Einfügen",
      clearUrl: "URL löschen",
      convertButton: "Konvertieren",
      convertAriaLabel: "YouTube-Video Konvertieren",
      analyzingLabel: "Ihre MP3- und MP4-Download-Optionen werden vorbereitet...",
      analyzingSublabel: "YouTube-Videodetails werden abgerufen",
      emptyUrlError: "Bitte fügen Sie eine gültige YouTube-Video-URL ein.",
      clipboardUnsupported: "Zwischenablage wird in diesem Browser nicht unterstützt. Bitte nutzen Sie Strg+V.",
      clipboardEmpty: "Die Zwischenablage ist leer.",
      clipboardBlocked: "Zugriff auf Zwischenablage blockiert. Bitte drücken Sie Strg+V zum Einfügen.",
    },
    downloadCard: {
      readyBadge: "Bereit zum Download",
      convertAnother: "Weiteres Video",
      durationLabel: "Dauer",
      selectFormatHint:
        "Wählen Sie unten Ihr gewünschtes Download-Format. MP3 extrahiert die Audiospur in höchster Qualität; MP4 lädt das komplette HD-Video herunter.",
      downloadMp3: "MP3 Herunterladen",
      audioBadge: "Audio",
      mp3Quality: "320 kbps Studioqualität Audio",
      convertingAudio: "Audio wird konvertiert...",
      downloadMp4: "MP4 Herunterladen",
      videoBadge: "Video",
      mp4Quality: "Full HD 1080p / 720p Video",
      downloadingVideo: "Video wird heruntergeladen...",
      extractingMp3Progress: "Audio wird extrahiert und in MP3 umgewandelt...",
      mergingMp4Progress: "Videostreams werden in MP4 zusammengefügt...",
      downloadStartedTitle: "Download wurde gestartet!",
      manualSavePrompt: "Download nicht automatisch gestartet?",
      manualSaveLink: "Hier klicken zum Speichern",
      convertAnotherVideo: "Weiteres Video Konvertieren",
      downloadErrorTitle: "Download-Fehler",
      retryButton: "Erneut Versuchen",
      cancelButton: "Abbrechen",
    },
    howItWorks: {
      badge: "Einfacher 3-Schritte-Prozess",
      title: "So Laden Sie YouTube-Videos Herunter",
      subtitle: "Speichern Sie jedes YouTube-Video mit wenigen Klicks als MP3-Audio oder MP4-Video.",
      fastEasy: "Schnell & Einfach",
      steps: [
        {
          title: "YouTube-URL Einfügen",
          description:
            "Kopieren Sie den Link des gewünschten YouTube-Videos und fügen Sie ihn oben in das Eingabefeld ein.",
        },
        {
          title: "Auf Konvertieren Klicken",
          description:
            "Klicken Sie auf Konvertieren, um die Videodetails abzurufen und Ihre zwei Download-Optionen anzuzeigen.",
        },
        {
          title: "MP3 oder MP4 Herunterladen",
          description:
            "Wählen Sie entweder MP3 Herunterladen für Audio oder MP4 Herunterladen für das vollständige Video.",
        },
      ],
      ctaTitle: "Bereit, ein YouTube-Video zu konvertieren?",
      ctaSubtitle: "Fügen Sie Ihren YouTube-Link auf der Startseite ein, um MP3- und MP4-Optionen zu erhalten.",
      ctaButton: "Zum Downloader",
    },
    formats: {
      badge: "Zwei Einfache Optionen",
      title: "Verfügbare Download-Formate",
      subtitle:
        "Jeder YouTube-Link bietet Ihnen zwei direkte Download-Möglichkeiten: MP3 für Audio oder MP4 für Video.",
      mp3Name: "MP3-Audio-Download",
      mp3Quality: "320 kbps Hohe Qualität",
      mp3Tag: "Audio-Option",
      mp3Desc:
        "Extrahieren Sie klares 320-kbps-MP3-Audio aus jedem YouTube-Video. Ideal für Musik, Podcasts und Offline-Wiedergabe.",
      mp4Name: "MP4-Video-Download",
      mp4Quality: "Full HD 1080p / 720p",
      mp4Tag: "Video-Option",
      mp4Desc:
        "Laden Sie das komplette YouTube-Video mit Bild und Ton im Standard-MP4-Format für alle Geräte herunter.",
    },
    whyChoose: {
      badge: "Schnell & Einfach",
      title: "Warum MediaNest Nutzen?",
      subtitle: "Entwickelt als einfachster Weg, um YouTube-Videos als MP3 oder MP4 herunterzuladen.",
      readyBadge: "Sofort Startklar",
      items: [
        {
          title: "Ein-Feld-Bedienung",
          description:
            "Keine komplizierten Einstellungen. Einfach den YouTube-Link einfügen und auf Konvertieren klicken.",
        },
        {
          title: "Hochwertiges MP3-Audio",
          description:
            "Wandeln Sie jedes YouTube-Video mit einem Klick in eine 320 kbps MP3-Audiodatei um.",
        },
        {
          title: "Full HD MP4-Video",
          description:
            "Speichern Sie komplette YouTube-Videos im MP4-Format in gestochen scharfer 1080p- oder 720p-Qualität.",
        },
        {
          title: "Ohne Registrierung & Proxy",
          description:
            "Kostenlos direkt im Browser nutzbar – ohne Anmeldung, ohne Software-Installation und ohne Proxy.",
        },
      ],
    },
    faq: {
      badge: "Haben Sie Fragen?",
      title: "Häufig Gestellte Fragen",
      subtitle: "Alles Wichtige zum Herunterladen von YouTube-Videos im MP3- und MP4-Format.",
      items: [
        {
          question: "Wie lade ich ein YouTube-Video als MP3 oder MP4 herunter?",
          answer:
            "Kopieren Sie den YouTube-Videolink, fügen Sie ihn auf unserer Startseite in das Eingabefeld ein und klicken Sie auf Konvertieren. Wählen Sie anschließend 'MP3 Herunterladen' oder 'MP4 Herunterladen'.",
        },
        {
          question: "Welche Download-Formate stehen zur Verfügung?",
          answer:
            "Wir bieten für jedes YouTube-Video genau zwei direkte Optionen: MP3 (320 kbps Audio) und MP4 (Full HD 1080p / 720p Video mit Ton).",
        },
        {
          question: "Benötige ich einen Proxy oder ein Benutzerkonto?",
          answer:
            "Nein. Sie benötigen weder Proxy noch VPN, Software oder ein Konto. Einfach die YouTube-URL einfügen und direkt im Browser herunterladen.",
        },
        {
          question: "Ist MediaNest kostenlos?",
          answer:
            "Ja, MediaNest ist komplett kostenlos. Sie können YouTube-Videos ohne Registrierung in MP3 oder MP4 umwandeln.",
        },
        {
          question: "Werden heruntergeladene Dateien auf dem Server gespeichert?",
          answer:
            "Nein. Temporäre Dateien aus der MP3- oder MP4-Konvertierung werden kurz nach Abschluss Ihres Downloads automatisch gelöscht.",
        },
      ],
      stillHaveQuestions: "Noch Fragen offen?",
      reachOutText: "Kontaktieren Sie uns über unsere Kontaktseite.",
      contactUsBtn: "Kontakt",
    },
    privacy: {
      title: "Datenschutzerklärung",
      subtitle:
        "MediaNest bietet einen einfachen Dienst, bei dem Sie eine YouTube-Video-URL einfügen und MP3-Audio oder MP4-Video herunterladen, ohne ein Konto zu erstellen.",
      sections: [
        {
          title: "1. Keine Registrierung oder Persönliche Daten",
          body: "Für die Nutzung unseres YouTube zu MP3 und MP4 Downloaders ist weder eine Anmeldung noch die Angabe von Name oder E-Mail-Adresse erforderlich.",
        },
        {
          title: "2. Temporäre Dateiverarbeitung",
          body: "Wenn Sie einen YouTube-Link einfügen und MP3 oder MP4 wählen, wird die konvertierte Datei nur kurzzeitig für Ihren Download bereitgestellt und nach 15 Minuten automatisch gelöscht.",
        },
        {
          title: "3. Kontakt",
          body: "Bei Fragen zum Datenschutz erreichen Sie uns jederzeit über unsere Kontaktseite.",
        },
      ],
    },
    terms: {
      title: "Nutzungsbedingungen",
      subtitle:
        "Bitte beachten Sie die Bedingungen für die Nutzung von MediaNest zum Konvertieren und Herunterladen von YouTube-Videos in MP3 und MP4.",
      sections: [
        {
          title: "1. Leistungsbeschreibung",
          body: "MediaNest ermöglicht das Einfügen einer YouTube-Video-URL in ein Eingabefeld und das Herunterladen in zwei Formaten: MP3-Audio oder MP4-Video.",
        },
        {
          title: "2. Persönliche Nutzung",
          body: "Nutzer sind selbst dafür verantwortlich, geltende Urheberrechtsbestimmungen einzuhalten. Automatisierte Bots sind untersagt.",
        },
        {
          title: "3. Kontakt",
          body: "Bei Fragen zu diesen Bedingungen besuchen Sie bitte unsere Kontaktseite.",
        },
      ],
    },
    contact: {
      title: "Kontakt",
      subtitle: "Brauchen Sie Hilfe beim Konvertieren eines YouTube-Links in MP3 oder MP4? Schreiben Sie uns.",
      cardTitle: "E-Mail-Support",
      cardBody:
        "Falls sich eine YouTube-URL nicht konvertieren lässt oder Sie Feedback zu unseren MP3- und MP4-Optionen haben, senden Sie uns eine E-Mail:",
    },
    footer: {
      quickLinks: "Schnellzugriff",
      youtubeDownloader: "YouTube Downloader",
      howItWorks: "So Funktioniert's",
      faq: "FAQ",
      privacyPolicy: "Datenschutz",
      termsOfService: "Nutzungsbedingungen",
      contact: "Kontakt",
      copyrightTagline: "Schneller YouTube zu MP3 & MP4 Downloader.",
    },
  },
  pt: {
    meta: {
      title: "MediaNest — Baixar Vídeos do YouTube em MP3 e MP4",
      description:
        "Cole qualquer URL de vídeo do YouTube para converter e baixar áudio MP3 de alta qualidade ou vídeo MP4 instantaneamente.",
    },
    header: {
      subtitle: "Baixador de YouTube MP3 e MP4",
      home: "Início",
      howItWorks: "Como Funciona",
      faq: "FAQ",
      contact: "Contato",
      languageLabel: "Idioma",
    },
    hero: {
      badge: "Conversor de YouTube para MP3 e MP4",
      title: "Baixar Vídeos do YouTube em MP3 ou MP4",
      subtitle:
        "Cole qualquer link de vídeo do YouTube abaixo, clique em Converter e escolha áudio MP3 ou vídeo MP4 para baixar na hora.",
      pillMp3: "Áudio MP3 (320 kbps)",
      pillMp4: "Vídeo MP4 (Full HD)",
      pillFast: "Download Rápido e Grátis",
      inputLabel: "Cole a URL do Vídeo do YouTube",
      inputPlaceholder: "Cole a URL do vídeo do YouTube aqui (ex. https://www.youtube.com/watch?v=...)",
      pasteButton: "Colar",
      clearUrl: "Limpar URL",
      convertButton: "Converter",
      convertAriaLabel: "Converter Vídeo do YouTube",
      analyzingLabel: "Preparando suas opções de download MP3 e MP4...",
      analyzingSublabel: "Buscando detalhes do vídeo do YouTube",
      emptyUrlError: "Por favor, cole uma URL válida de vídeo do YouTube.",
      clipboardUnsupported: "Área de transferência não suportada neste navegador. Use Ctrl+V para colar.",
      clipboardEmpty: "A área de transferência está vazia.",
      clipboardBlocked: "Permissão da área de transferência bloqueada. Pressione Ctrl+V para colar.",
    },
    downloadCard: {
      readyBadge: "Pronto para Baixar",
      convertAnother: "Converter Outro",
      durationLabel: "Duração",
      selectFormatHint:
        "Selecione seu formato de download preferido abaixo. MP3 extrai o áudio em alta fidelidade; MP4 baixa o vídeo completo em alta definição.",
      downloadMp3: "Baixar MP3",
      audioBadge: "Áudio",
      mp3Quality: "Áudio Qualidade de Estúdio 320 kbps",
      convertingAudio: "Convertendo áudio...",
      downloadMp4: "Baixar MP4",
      videoBadge: "Vídeo",
      mp4Quality: "Vídeo Full HD 1080p / 720p",
      downloadingVideo: "Baixando vídeo...",
      extractingMp3Progress: "Extraindo áudio e codificando para MP3...",
      mergingMp4Progress: "Processando vídeo em MP4...",
      downloadStartedTitle: "o download foi iniciado!",
      manualSavePrompt: "O download não começou automaticamente?",
      manualSaveLink: "Clique aqui para salvar",
      convertAnotherVideo: "Converter Outro Vídeo",
      downloadErrorTitle: "Erro no Download",
      retryButton: "Tentar Novamente",
      cancelButton: "Cancelar",
    },
    howItWorks: {
      badge: "Processo Simples em 3 Passos",
      title: "Como Baixar Vídeos do YouTube",
      subtitle: "Salve qualquer vídeo do YouTube como áudio MP3 ou vídeo MP4 em poucos cliques.",
      fastEasy: "Rápido e Fácil",
      steps: [
        {
          title: "Cole a URL do YouTube",
          description:
            "Copie o link do vídeo do YouTube que deseja salvar e cole no campo de entrada acima.",
        },
        {
          title: "Clique em Converter",
          description:
            "Pressione o botão Converter para carregar os detalhes do vídeo e exibir as duas opções de download.",
        },
        {
          title: "Baixe em MP3 ou MP4",
          description:
            "Clique no botão Baixar MP3 para áudio ou Baixar MP4 para o vídeo completo e salve direto no seu dispositivo.",
        },
      ],
      ctaTitle: "Pronto para converter um vídeo do YouTube?",
      ctaSubtitle: "Cole seu link do YouTube na página inicial para ver as opções MP3 e MP4.",
      ctaButton: "Ir para o Conversor",
    },
    formats: {
      badge: "Duas Opções Simples",
      title: "Formatos de Download Disponíveis",
      subtitle:
        "Cada link do YouTube oferece duas escolhas diretas de download: MP3 para áudio ou MP4 para vídeo.",
      mp3Name: "Download de Áudio MP3",
      mp3Quality: "Alta Qualidade 320 kbps",
      mp3Tag: "Opção de Áudio",
      mp3Desc:
        "Extraia áudio MP3 limpo e de alta qualidade de qualquer vídeo do YouTube. Ideal para músicas, podcasts e ouvir offline.",
      mp4Name: "Download de Vídeo MP4",
      mp4Quality: "Full HD 1080p / 720p",
      mp4Tag: "Opção de Vídeo",
      mp4Desc:
        "Baixe o vídeo completo do YouTube com imagem e som em formato padrão MP4, compatível com celulares, tablets e computadores.",
    },
    whyChoose: {
      badge: "Rápido e Simples",
      title: "Por Que Usar o MediaNest?",
      subtitle: "Projetado para ser a maneira mais simples de baixar vídeos do YouTube em MP3 ou MP4.",
      readyBadge: "Pronto para Usar",
      items: [
        {
          title: "Apenas Um Campo",
          description:
            "Sem configurações complicadas. Basta colar o link do vídeo do YouTube e clicar em Converter.",
        },
        {
          title: "Áudio MP3 de Alta Qualidade",
          description:
            "Converta qualquer vídeo do YouTube em um arquivo de áudio MP3 de 320 kbps com um único clique.",
        },
        {
          title: "Vídeo MP4 Full HD",
          description:
            "Salve vídeos completos do YouTube em formato MP4 com qualidade nítida em 1080p ou 720p.",
        },
        {
          title: "Sem Cadastro ou Proxy",
          description:
            "Gratuito direto no seu navegador, sem criar conta, sem instalar programas e sem precisar de proxy.",
        },
      ],
    },
    faq: {
      badge: "Dúvidas?",
      title: "Perguntas Frequentes",
      subtitle: "Tudo o que você precisa saber sobre como baixar vídeos do YouTube em MP3 e MP4.",
      items: [
        {
          question: "Como baixo um vídeo do YouTube em MP3 ou MP4?",
          answer:
            "Basta copiar o link do vídeo do YouTube, colar no campo da nossa página inicial e clicar em Converter. Depois escolha 'Baixar MP3' ou 'Baixar MP4'.",
        },
        {
          question: "Quais formatos de download estão disponíveis?",
          answer:
            "Oferecemos duas opções diretas para cada vídeo do YouTube: MP3 (áudio de alta qualidade 320 kbps) e MP4 (vídeo Full HD 1080p / 720p com som).",
        },
        {
          question: "Preciso de proxy ou conta para baixar vídeos do YouTube?",
          answer:
            "Não. Você não precisa de proxy, VPN, instalação de programas nem conta. Basta colar a URL do YouTube e baixar direto no navegador.",
        },
        {
          question: "O MediaNest é gratuito?",
          answer:
            "Sim, o MediaNest é totalmente gratuito. Você pode converter e baixar vídeos do YouTube para MP3 ou MP4 sem cadastro.",
        },
        {
          question: "Os arquivos baixados ficam salvos no servidor?",
          answer:
            "Não. Os arquivos temporários gerados durante a conversão para MP3 ou MP4 são excluídos automaticamente logo após o término do download.",
        },
      ],
      stillHaveQuestions: "Ainda tem alguma dúvida?",
      reachOutText: "Entre em contato conosco pela nossa página de suporte.",
      contactUsBtn: "Fale Conosco",
    },
    privacy: {
      title: "Política de Privacidade",
      subtitle:
        "O MediaNest oferece um serviço simples onde você cola a URL de um vídeo do YouTube e baixa áudio MP3 ou vídeo MP4 sem criar conta ou compartilhar dados pessoais.",
      sections: [
        {
          title: "1. Sem Cadastro ou Dados Pessoais",
          body: "Não exigimos cadastro, login, nome ou endereço de e-mail para usar nosso baixador de YouTube para MP3 e MP4.",
        },
        {
          title: "2. Processamento Temporário de Arquivos",
          body: "Quando você cola um link do YouTube e escolhe MP3 ou MP4, o arquivo convertido é armazenado temporariamente apenas para entregar seu download e é apagado automaticamente após 15 minutos.",
        },
        {
          title: "3. Contato",
          body: "Se tiver dúvidas sobre nossa política de privacidade, fale conosco pela página de Contato.",
        },
      ],
    },
    terms: {
      title: "Termos de Serviço",
      subtitle:
        "Confira os termos de uso do MediaNest para converter e baixar vídeos do YouTube nos formatos MP3 e MP4.",
      sections: [
        {
          title: "1. Descrição do Serviço",
          body: "O MediaNest permite colar a URL de um vídeo do YouTube em um único campo e baixar a mídia em dois formatos: áudio MP3 ou vídeo MP4.",
        },
        {
          title: "2. Uso Pessoal",
          body: "Os usuários são responsáveis por garantir que seus downloads respeitem as leis de direitos autorais aplicáveis. Não é permitido o uso de bots automatizados.",
        },
        {
          title: "3. Contato",
          body: "Para dúvidas sobre estes termos, acesse nossa página de Contato.",
        },
      ],
    },
    contact: {
      title: "Fale Conosco",
      subtitle: "Precisa de ajuda para converter um link do YouTube para MP3 ou MP4? Fale com nossa equipe abaixo.",
      cardTitle: "Suporte por E-mail",
      cardBody:
        "Se uma URL do YouTube falhar ao converter ou se você tiver sugestões sobre nossas opções de download MP3 e MP4, envie um e-mail:",
    },
    footer: {
      quickLinks: "Links Rápidos",
      youtubeDownloader: "Baixador do YouTube",
      howItWorks: "Como Funciona",
      faq: "FAQ",
      privacyPolicy: "Política de Privacidade",
      termsOfService: "Termos de Serviço",
      contact: "Contato",
      copyrightTagline: "Conversor Rápido de YouTube para MP3 e MP4.",
    },
  },
};
