import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { Database, HardDrive, Shield } from 'lucide-react';
import DataStorageSettings from './DataStorageSettings';

const DataPrivacySettings = () => {
  const [activeTab, setActiveTab] = useState('storage');

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-100 mb-4">Veri ve Gizlilik</h2>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 mb-8">
          <TabsTrigger 
            value="storage" 
            className="flex items-center gap-2 data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-300"
          >
            <HardDrive size={16} />
            <span>Veri Depolama</span>
          </TabsTrigger>
          <TabsTrigger 
            value="access" 
            className="flex items-center gap-2 data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-300"
          >
            <Database size={16} />
            <span>Veri Erişimi</span>
          </TabsTrigger>
          <TabsTrigger 
            value="privacy" 
            className="flex items-center gap-2 data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-300"
          >
            <Shield size={16} />
            <span>Gizlilik Kontrolleri</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="storage" className="space-y-6">
          <DataStorageSettings />
        </TabsContent>
        
        <TabsContent value="access" className="space-y-6">
          <div className="bg-gray-700/40 border border-gray-600/40 rounded-lg p-5">
            <h3 className="text-lg font-medium text-gray-200 mb-4">Verilerinize Erişim</h3>
            <p className="text-gray-300 mb-4">
              Hesabınızdaki tüm verilere erişebilir, indirebilir veya silme talebinde bulunabilirsiniz.
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <button className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 py-3 px-4 rounded-lg transition">
                Verilerimi İndir
              </button>
              <button className="bg-red-600/20 hover:bg-red-600/30 text-red-300 py-3 px-4 rounded-lg transition">
                Veri Silme Talebi
              </button>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="privacy" className="space-y-6">
          <div className="bg-gray-700/40 border border-gray-600/40 rounded-lg p-5">
            <h3 className="text-lg font-medium text-gray-200 mb-4">Gizlilik Kontrolleri</h3>
            <p className="text-gray-300 mb-4">
              Bilgilerinizin nasıl kullanıldığını ve paylaşıldığını kontrol edin.
            </p>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-gray-600/40">
                <div>
                  <h4 className="text-gray-200 font-medium">Analitik Veri Toplama</h4>
                  <p className="text-sm text-gray-400">Uygulama kullanımınızla ilgili veri toplama</p>
                </div>
                <div className="form-control">
                  <input type="checkbox" className="toggle toggle-primary" defaultChecked />
                </div>
              </div>
              
              <div className="flex justify-between items-center py-2 border-b border-gray-600/40">
                <div>
                  <h4 className="text-gray-200 font-medium">Kişiselleştirilmiş Reklamlar</h4>
                  <p className="text-sm text-gray-400">İlgi alanlarınıza göre reklamlar gösterme</p>
                </div>
                <div className="form-control">
                  <input type="checkbox" className="toggle toggle-primary" />
                </div>
              </div>
              
              <div className="flex justify-between items-center py-2">
                <div>
                  <h4 className="text-gray-200 font-medium">Konum Verisi</h4>
                  <p className="text-sm text-gray-400">Konum bilgilerinizin kullanılması</p>
                </div>
                <div className="form-control">
                  <input type="checkbox" className="toggle toggle-primary" />
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DataPrivacySettings; 