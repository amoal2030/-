import React, { useState } from 'react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { PhoneSimulator } from './components/PhoneSimulator';
import { PricingSection } from './components/PricingSection';
import { Testimonials } from './components/Testimonials';
import { ContactSection } from './components/ContactSection';
import { Footer } from './components/Footer';
import { QRCodeModal } from './components/QRCodeModal';
import { ServiceMode, PricingPlan, BillingCycle } from './types';

export default function App() {
  const [currentMode, setCurrentMode] = useState<ServiceMode>('order');
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const [activeQrTable, setActiveQrTable] = useState<string>('04');
  const [selectedPlanForContact, setSelectedPlanForContact] = useState<PricingPlan | null>(null);
  const [selectedCycleForContact, setSelectedCycleForContact] = useState<BillingCycle>('buyout');

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleOpenQrModal = (tableNo: string = '04') => {
    setActiveQrTable(tableNo);
    setIsQrModalOpen(true);
  };

  const handleSelectPlan = (plan: PricingPlan, cycle: BillingCycle) => {
    setSelectedPlanForContact(plan);
    setSelectedCycleForContact(cycle);
    scrollToSection('contact');
  };

  return (
    <div className="min-h-screen bg-[#F9F8F6] text-[#333333] flex flex-col font-['Cairo',sans-serif]">
      {/* Top Bar Header */}
      <Header
        onOpenContact={() => scrollToSection('contact')}
        onScrollTo={scrollToSection}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {/* 1. Hero Section */}
        <Hero
          onExploreSimulator={() => scrollToSection('simulator')}
          onExplorePricing={() => scrollToSection('pricing')}
          onOpenQrDemo={() => handleOpenQrModal('04')}
        />

        {/* 2. Interactive Phone Simulator for all 3 Services */}
        <PhoneSimulator
          currentMode={currentMode}
          onChangeMode={setCurrentMode}
          onOpenQrModal={handleOpenQrModal}
        />

        {/* 3. Pricing Plans & Calculator */}
        <PricingSection
          onSelectPlan={handleSelectPlan}
        />

        {/* 5. Customer Proof & Testimonials */}
        <Testimonials />

        {/* 7. Restaurant Onboarding / Contact */}
        <ContactSection
          selectedPlan={selectedPlanForContact}
          selectedCycle={selectedCycleForContact}
        />
      </main>

      {/* Footer */}
      <Footer
        onScrollTo={scrollToSection}
        onOpenQrDemo={() => handleOpenQrModal('04')}
      />

      {/* Global QR Code Generator Modal */}
      <QRCodeModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        defaultTable={activeQrTable}
      />
    </div>
  );
}
