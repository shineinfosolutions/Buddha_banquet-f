import { useState, useEffect } from 'react';
import { FaTrash, FaEdit, FaPlus } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';

const CategoryForm = ({ onSave, onCancel }) => {
  const [categoryData, setCategoryData] = useState({ cateName: '', status: 'active' });
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Category Name</label>
        <input type="text" value={categoryData.cateName}
          onChange={(e) => setCategoryData(p => ({ ...p, cateName: e.target.value }))}
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#c3ad6b]"
          placeholder="Enter category name" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
        <select value={categoryData.status} onChange={(e) => setCategoryData(p => ({ ...p, status: e.target.value }))}
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#c3ad6b]">
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>
      <div className="flex gap-2 pt-2">
        <button onClick={() => onSave(categoryData)}
          className="flex-1 py-2 bg-[#c3ad6b] hover:bg-[#b39b5a] text-white rounded-lg text-sm font-medium transition-colors">
          Save
        </button>
        <button onClick={onCancel}
          className="flex-1 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-medium transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
};

const PlanEditor = ({ plan, onSave, onCancel, onDelete, onCategoriesUpdate }) => {
  const [editorCategories, setEditorCategories] = useState([]);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [formData, setFormData] = useState(() => ({
    ratePlan: 'Silver',
    foodType: 'Veg',
    limits: {},
    ...(plan && Object.keys(plan).length > 0 ? { ...plan, limits: plan.limits || {} } : {})
  }));

  const refreshCategories = async () => {
    try {
      const res = await api.get('/api/categories/all');
      const cats = Array.isArray(res.data) ? res.data : [];
      setEditorCategories(cats);
      onCategoriesUpdate(cats);
    } catch {}
  };

  useEffect(() => { refreshCategories(); }, []);

  const handleCreateCategory = async (categoryData) => {
    try {
      await api.post('/api/categories/create', categoryData);
      await refreshCategories();
      setShowCategoryForm(false);
    } catch { alert('Failed to create category'); }
  };

  const handleDeleteCategory = async (categoryId) => {
    if (!window.confirm('Delete this category?')) return;
    try {
      await api.delete(`/api/categories/delete/${categoryId}`);
      await refreshCategories();
      setFormData(prev => {
        const newLimits = { ...prev.limits };
        delete newLimits[categoryId];
        return { ...prev, limits: newLimits };
      });
    } catch { alert('Failed to delete category'); }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="bg-[#c3ad6b] px-6 py-4 rounded-t-xl flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">{plan?._id ? 'Edit' : 'Add'} Plan Limits</h3>
          <button onClick={onCancel} className="text-white/80 hover:text-white text-xl font-bold">✕</button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rate Plan</label>
              <select value={formData.ratePlan} onChange={(e) => setFormData(p => ({ ...p, ratePlan: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#c3ad6b]">
                <option value="Silver">Silver</option>
                <option value="Gold">Gold</option>
                <option value="Platinum">Platinum</option>
                <option value="Normal Lunch">Normal Lunch</option>
                <option value="Normal Dinner">Normal Dinner</option>
                <option value="Hi-Tea">Hi-Tea</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Food Type</label>
              <select value={formData.foodType} onChange={(e) => setFormData(p => ({ ...p, foodType: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#c3ad6b]">
                <option value="Veg">Veg</option>
                <option value="Non-Veg">Non-Veg</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-sm font-semibold text-gray-700">Category Limits</h4>
              <button onClick={() => setShowCategoryForm(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-[#c3ad6b] hover:bg-[#b39b5a] text-white rounded-lg text-xs font-medium transition-colors">
                <FaPlus size={10} /> Add Category
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {editorCategories.filter(c => c.status === 'active').map(cat => (
                <div key={cat._id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-semibold text-gray-700">{cat.cateName}</label>
                    <button onClick={() => handleDeleteCategory(cat._id)} className="text-red-400 hover:text-red-600 transition-colors">
                      <FaTrash size={11} />
                    </button>
                  </div>
                  <input type="number" min="0"
                    value={formData.limits?.[cat._id] || formData.limits?.[cat.cateName] || 0}
                    onChange={(e) => setFormData(p => ({ ...p, limits: { ...p.limits, [cat._id]: parseInt(e.target.value) || 0 } }))}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#c3ad6b]" />
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <button onClick={() => onSave(formData)}
              className="px-5 py-2 bg-[#c3ad6b] hover:bg-[#b39b5a] text-white rounded-lg text-sm font-medium transition-colors">
              Save
            </button>
            {plan?._id && (
              <button onClick={() => { if (window.confirm('Delete this plan?')) onDelete(plan); }}
                className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors">
                Delete
              </button>
            )}
            <button onClick={onCancel}
              className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-medium transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </div>

      {showCategoryForm && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-base font-bold text-gray-800 mb-4">Add Category</h3>
            <CategoryForm onSave={handleCreateCategory} onCancel={() => setShowCategoryForm(false)} />
          </div>
        </div>
      )}
    </div>
  );
};

const PlanLimitManager = () => {
  const [limits, setLimits] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);

  const fetchLimits = async () => {
    setLoading(true);
    try {
      const [limitsRes, catsRes] = await Promise.all([
        api.get('/api/plan-limits/get'),
        api.get('/api/categories/all')
      ]);
      setLimits(limitsRes.data?.success ? limitsRes.data.data : []);
      setCategories(Array.isArray(catsRes.data) ? catsRes.data : []);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { fetchLimits(); }, []);

  const handleSave = async (planData) => {
    try {
      if (planData._id) {
        await api.put(`/api/plan-limits/${planData._id}`, planData);
      } else {
        await api.post('/api/plan-limits', planData);
      }
      setEditingPlan(null);
      fetchLimits();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save plan limits');
    }
  };

  const handleDelete = async (plan) => {
    try {
      await api.delete(`/api/plan-limits/${plan._id}`);
      setEditingPlan(null);
      fetchLimits();
    } catch {
      alert('Failed to delete plan');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white rounded-xl shadow-md overflow-hidden">
      <div className="bg-[#c3ad6b] px-6 py-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Plan Limit Manager</h2>
        <button onClick={() => setEditingPlan({})}
          className="flex items-center gap-2 px-4 py-2 bg-white text-[#c3ad6b] rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors">
          <FaPlus size={12} /> Add New Plan
        </button>
      </div>

      <div className="p-4 sm:p-6">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#c3ad6b]"></div>
          </div>
        ) : limits.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">No plan limits found. Click "Add New Plan" to get started.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {limits.map((limit, idx) => (
                <motion.div
                  key={`${limit.ratePlan}-${limit.foodType}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: idx * 0.06 }}
                  className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                  <div className="bg-[#c3ad6b]/10 border-b border-[#c3ad6b]/20 px-4 py-3 flex justify-between items-center">
                    <div>
                      <span className="font-bold text-gray-800">{limit.ratePlan}</span>
                      <span className="mx-2 text-gray-400">·</span>
                      <span className={`text-sm font-medium ${limit.foodType === 'Veg' ? 'text-green-600' : 'text-red-500'}`}>
                        {limit.foodType}
                      </span>
                    </div>
                    <button onClick={() => setEditingPlan(limit)}
                      className="flex items-center gap-1 px-3 py-1 bg-[#c3ad6b] hover:bg-[#b39b5a] text-white rounded-lg text-xs font-medium transition-colors">
                      <FaEdit size={10} /> Edit
                    </button>
                  </div>
                  <div className="px-4 py-3 space-y-2">
                    {Object.entries(limit.limits || {}).map(([key, value]) => {
                      const cat = categories.find(c => c._id === key || c.cateName === key);
                      return (
                        <div key={key} className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">{cat?.cateName || key}</span>
                          <span className="font-semibold text-gray-800 bg-white px-2 py-0.5 rounded border border-gray-200">{value}</span>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {editingPlan && (
        <PlanEditor
          plan={editingPlan}
          onSave={handleSave}
          onCancel={() => setEditingPlan(null)}
          onCategoriesUpdate={setCategories}
          onDelete={(p) => { handleDelete(p); setEditingPlan(null); }}
        />
      )}
    </motion.div>
  );
};

export default PlanLimitManager;
