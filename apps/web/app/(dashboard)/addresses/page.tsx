import { createClient } from '@/lib/supabase/server';
import { AddressList } from '@/components/addresses/address-list';
import { CreateAddressButton } from '@/components/addresses/create-address-button';

export default async function AddressesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: addresses } = await supabase
    .from('addresses')
    .select('*')
    .eq('user_id', user.id)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Addresses</h1>
        <CreateAddressButton />
      </div>
      <AddressList addresses={addresses || []} />
    </div>
  );
}
