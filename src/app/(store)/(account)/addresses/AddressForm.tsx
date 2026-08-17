'use client';

import React, { useState } from 'react';
import { MapPin, Plus, Edit, Trash2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/context/ToastContext';
import { useRouter } from 'next/navigation';
import { createAddressAction } from '@/actions/address/createAddressAction';
import { updateAddressAction } from '@/actions/address/updateAddressAction';
import { deleteAddressAction } from '@/actions/address/deleteAddressAction';
import { setDefaultAddressAction } from '@/actions/address/setDefaultAddressAction';
import { AccountEmptyState } from '@/components/store/account/AccountEmptyState';

// Define Address type based on database schema
interface Address {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2?: string | null;
  city: string;
  state: string;
  postal_code: string;
  is_default: boolean;
  created_at: string;
}

interface AddressFormProps {
  initialAddresses: Address[];
}

/**
 * AddressForm Client Component to manage saved customer addresses.
 * Renders the addresses list, edit/add modals, and handles all server action integrations.
 */
export default function AddressForm({ initialAddresses }: AddressFormProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Partial<Address> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleOpenAdd = () => {
    setErrors({});
    setEditingAddress({
      full_name: '',
      phone: '',
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      postal_code: '',
      is_default: initialAddresses.length === 0,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (addr: Address) => {
    setErrors({});
    setEditingAddress(addr);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAddress || isSubmitting) return;

    const { full_name = '', phone = '', address_line1 = '', address_line2 = '', city = '', state = '', postal_code = '', is_default = false } = editingAddress;

    const newErrors: Record<string, string> = {};
    if (!full_name.trim()) newErrors.full_name = 'Full name is required';
    if (!phone.trim() || phone.trim().length < 10) newErrors.phone = 'Enter a valid 10-digit phone number';
    if (!address_line1.trim()) newErrors.address_line1 = 'Address is required';
    if (!city.trim()) newErrors.city = 'City is required';
    if (!state.trim()) newErrors.state = 'State is required';
    if (!postal_code.trim()) newErrors.postal_code = 'Enter a valid PIN code';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    setIsSubmitting(true);

    let res;
    if (editingAddress.id) {
      res = await updateAddressAction({
        addressId: editingAddress.id,
        fullName: full_name,
        phone,
        addressLine1: address_line1,
        addressLine2: address_line2 || undefined,
        city,
        state,
        postalCode: postal_code,
        isDefault: is_default,
      });
    } else {
      res = await createAddressAction({
        fullName: full_name,
        phone,
        addressLine1: address_line1,
        addressLine2: address_line2 || undefined,
        city,
        state,
        postalCode: postal_code,
        isDefault: is_default,
      });
    }

    setIsSubmitting(false);

    if (!res.success) {
      showToast('Address Action Failed', res.error, 'error');
    } else {
      showToast('Success', editingAddress.id ? 'Address updated successfully!' : 'Address added successfully!', 'success');
      setIsModalOpen(false);
      setEditingAddress(null);
      router.refresh();
    }
  };

  const handleDelete = async (id: string) => {
    if (isSubmitting) return;
    if (!confirm('Are you sure you want to delete this delivery address?')) return;

    setIsSubmitting(true);
    const res = await deleteAddressAction({ addressId: id });
    setIsSubmitting(false);

    if (!res.success) {
      showToast('Deletion Failed', res.error, 'error');
    } else {
      showToast('Success', 'Address deleted successfully!', 'success');
      router.refresh();
    }
  };

  const handleSetDefault = async (id: string) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    const res = await setDefaultAddressAction({ addressId: id });
    setIsSubmitting(false);

    if (!res.success) {
      showToast('Update Failed', res.error, 'error');
    } else {
      showToast('Success', 'Default address updated!', 'success');
      router.refresh();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="font-serif text-[28px] sm:text-3xl font-bold text-foreground leading-tight">Saved Delivery Addresses</h1>
        <Button onClick={handleOpenAdd} variant="primary" size="md" className="w-full sm:w-auto min-h-[48px] sm:min-h-0 font-serif font-bold text-xs tracking-wider">
          <Plus className="w-4 h-4 mr-1" />
          <span>Add New Address</span>
        </Button>
      </div>

      {initialAddresses.length === 0 ? (
        <AccountEmptyState
          Icon={MapPin}
          title="No saved shipping addresses"
          description="Add a delivery address to complete checkout faster."
          ctaLabel="Add Shipping Address"
          onCtaClick={handleOpenAdd}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {initialAddresses.map((addr) => (
            <div
              key={addr.id}
              className="bg-surface p-4 sm:p-6 lg:p-8 rounded-[20px] sm:rounded-2xl border border-border shadow-sm space-y-3 relative"
            >
              <div className="flex items-start justify-between">
                <span className="font-serif font-bold text-lg text-foreground">{addr.full_name}</span>
                {addr.is_default ? (
                  <span className="bg-surface-elevated border border-border text-foreground text-xs font-semibold px-2 py-1 rounded-md flex items-center space-x-1.5 shadow-sm">
                    <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                    <span>Default</span>
                  </span>
                ) : (
                  <button
                    onClick={() => handleSetDefault(addr.id)}
                    className="text-xs text-muted-foreground font-semibold hover:text-foreground transition-colors"
                    disabled={isSubmitting}
                  >
                    Set as Default
                  </button>
                )}
              </div>

              <div className="text-xs text-muted-foreground space-y-1">
                <p>
                  {addr.address_line1}
                  {addr.address_line2 ? `, ${addr.address_line2}` : ''}
                </p>
                <p>{addr.city}, {addr.state} - {addr.postal_code}</p>
                <p className="font-semibold text-muted-foreground">Phone: {addr.phone}</p>
              </div>

              <div className="pt-4 mt-2 border-t border-border flex items-center space-x-4">
                <button
                  onClick={() => handleOpenEdit(addr)}
                  className="text-sm text-foreground font-semibold flex items-center hover:text-accent transition-colors"
                  disabled={isSubmitting}
                >
                  <Edit className="w-4 h-4 mr-1.5" /> Edit
                </button>
                <button
                  onClick={() => handleDelete(addr.id)}
                  className="text-sm text-destructive font-semibold flex items-center hover:opacity-80 transition-opacity"
                  disabled={isSubmitting}
                >
                  <Trash2 className="w-4 h-4 mr-1.5" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Address Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingAddress?.id ? 'Edit Shipping Address' : 'Add New Shipping Address'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              value={editingAddress?.full_name || ''}
              onChange={(e) => { setEditingAddress({ ...editingAddress, full_name: e.target.value }); setErrors({ ...errors, full_name: '' }); }}
              placeholder="e.g. Priyanka Roy"
              error={errors.full_name}
              autoComplete="name"
              required
            />
            <Input
              label="Phone Number"
              type="tel"
              inputMode="numeric"
              value={editingAddress?.phone || ''}
              onChange={(e) => { setEditingAddress({ ...editingAddress, phone: e.target.value }); setErrors({ ...errors, phone: '' }); }}
              placeholder="9876543210"
              error={errors.phone}
              autoComplete="tel"
              required
            />
          </div>
          
          <Input
            label="Address Line 1"
            value={editingAddress?.address_line1 || ''}
            onChange={(e) => { setEditingAddress({ ...editingAddress, address_line1: e.target.value }); setErrors({ ...errors, address_line1: '' }); }}
            placeholder="Flat / House No / Street"
            error={errors.address_line1}
            autoComplete="address-line1"
            required
          />
          <Input
            label="Address Line 2 (Optional)"
            value={editingAddress?.address_line2 || ''}
            onChange={(e) => setEditingAddress({ ...editingAddress, address_line2: e.target.value })}
            placeholder="Landmark / Area"
            autoComplete="address-line2"
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="City"
              value={editingAddress?.city || ''}
              onChange={(e) => { setEditingAddress({ ...editingAddress, city: e.target.value }); setErrors({ ...errors, city: '' }); }}
              placeholder="Bengaluru"
              error={errors.city}
              autoComplete="address-level2"
              required
            />
            <Input
              label="State"
              value={editingAddress?.state || ''}
              onChange={(e) => { setEditingAddress({ ...editingAddress, state: e.target.value }); setErrors({ ...errors, state: '' }); }}
              placeholder="Karnataka"
              error={errors.state}
              autoComplete="address-level1"
              required
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="PIN Code"
              inputMode="numeric"
              value={editingAddress?.postal_code || ''}
              onChange={(e) => { setEditingAddress({ ...editingAddress, postal_code: e.target.value }); setErrors({ ...errors, postal_code: '' }); }}
              placeholder="560038"
              error={errors.postal_code}
              autoComplete="postal-code"
              required
            />
            {/* Placeholder for Address Type if needed in future */}
            <div className="hidden md:block"></div>
          </div>
          
          <div className="pt-4 pb-2">
            <div className="flex items-start space-x-3 bg-surface p-4 rounded-xl border border-border hover:border-accent/50 transition-colors cursor-pointer group focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-2 focus-within:ring-offset-background">
              <div className="relative flex items-center justify-center mt-0.5">
                <input
                  id="defaultAddressCheckbox"
                  type="checkbox"
                  className="peer sr-only"
                  aria-describedby="defaultAddressDesc"
                  checked={editingAddress?.is_default || false}
                  onChange={(e) => setEditingAddress({ ...editingAddress, is_default: e.target.checked })}
                />
                <div className="w-5 h-5 rounded border border-border bg-surface peer-checked:bg-primary peer-checked:border-primary transition-colors flex items-center justify-center group-hover:border-primary shadow-sm">
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary-foreground opacity-0 peer-checked:opacity-100 transition-opacity" />
                </div>
              </div>
              <div className="flex flex-col">
                <label 
                  htmlFor="defaultAddressCheckbox" 
                  className="text-sm font-semibold text-foreground cursor-pointer select-none"
                >
                  Set as default shipping address
                </label>
                <p id="defaultAddressDesc" className="text-xs text-muted-foreground mt-0.5">
                  This address will be selected automatically during checkout.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse md:flex-row md:justify-end gap-3 pt-6 mt-4 border-t border-border">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)} className="w-full md:w-auto">
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting} className="w-full md:w-auto">
              Save Shipping Address
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
