import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export function usePWAInstall() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState<boolean>(false)
  const [isIOS, setIsIOS] = useState<boolean>(false)

  useEffect(() => {
    // Détection PWA déjà installée en mode standalone
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    setIsInstalled(isStandalone)

    // Détection iOS (Safari ne supporte pas beforeinstallprompt, nécessite ajout manuel)
    const ua = window.navigator.userAgent.toLowerCase()
    const iosDevice = /iphone|ipad|ipod/.test(ua)
    setIsIOS(iosDevice)

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setInstallPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const promptInstall = async () => {
    if (!installPrompt) {
      if (isIOS) {
        alert("Pour installer Easy Vente sur votre iPhone / iPad :\n1. Touchez l'icône de Partage (carré avec flèche vers le haut)\n2. Sélectionnez 'Sur l'écran d'accueil'")
      } else {
        alert("Pour installer l'application sur votre PC ou navigateur :\nCliquez sur l'icône d'installation dans la barre d'adresse de votre navigateur (Chrome/Edge/Brave).")
      }
      return
    }

    await installPrompt.prompt()
    const choice = await installPrompt.userChoice
    if (choice.outcome === 'accepted') {
      setInstallPrompt(null)
      setIsInstalled(true)
    }
  }

  return {
    canInstall: !!installPrompt || isIOS,
    isInstalled,
    isIOS,
    promptInstall
  }
}
