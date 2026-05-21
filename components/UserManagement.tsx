
import React, { useState, useEffect } from 'react';
import { UserAccount, UserRole } from '../types';
import { fetchUsers, saveUserAccount, deleteUserAccount } from '../services/api';

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    displayName: '',
    role: UserRole.OPERATOR
  });

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const data = await fetchUsers();
      setUsers(data);
    } catch (error) {
      console.error("Erro ao carregar usuários:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.email || !newUser.displayName || isSubmitting) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    // Validação de formato de e-mail
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(newUser.email)) {
      setErrorMessage("Por favor, insira um e-mail válido.");
      return;
    }

    // Verificar se o usuário já existe na lista local
    if (users.some(u => u.email.toLowerCase() === newUser.email.toLowerCase())) {
      setErrorMessage("Este e-mail já está cadastrado.");
      return;
    }

    try {
      setIsSubmitting(true);
      // Usamos o email como identificador único para o documento
      const userAccount: UserAccount = {
        uid: newUser.email, 
        email: newUser.email,
        displayName: newUser.displayName,
        role: UserRole.OPERATOR, 
        createdAt: Date.now()
      };

      console.log("Tentando salvar usuário:", userAccount);
      await saveUserAccount(userAccount);
      await loadUsers();
      setIsAdding(false);
      setNewUser({ email: '', displayName: '', role: UserRole.OPERATOR });
      setSuccessMessage("Usuário salvo com sucesso!");
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (error) {
      console.error("Erro ao adicionar usuário:", error);
      setErrorMessage("Erro ao salvar usuário. Verifique sua conexão ou permissões.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (email: string) => {
    try {
      await deleteUserAccount(email);
      await loadUsers();
    } catch (error) {
      console.error("Erro ao excluir usuário:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <i className="fas fa-circle-notch fa-spin text-3xl text-blue-600"></i>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Gerenciamento de Operadores</h3>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2"
        >
          <i className={`fas ${isAdding ? 'fa-times' : 'fa-user-plus'}`}></i>
          {isAdding ? 'Cancelar' : 'Novo Operador'}
        </button>
      </div>

      {successMessage && (
        <div className="bg-emerald-100 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl flex items-center gap-2 animate-in slide-in-from-top duration-300">
          <i className="fas fa-check-circle"></i>
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="bg-rose-100 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl flex items-center gap-2 animate-in slide-in-from-top duration-300">
          <i className="fas fa-exclamation-circle"></i>
          {errorMessage}
        </div>
      )}

      {isAdding && (
        <form onSubmit={handleAddUser} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-blue-100 dark:border-slate-700 shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Nome Completo</label>
              <input 
                type="text" 
                value={newUser.displayName}
                onChange={(e) => setNewUser({...newUser, displayName: e.target.value})}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 transition-all text-sm"
                placeholder="Ex: João Silva"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">E-mail Google</label>
              <input 
                type="email" 
                value={newUser.email}
                onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 transition-all text-sm"
                placeholder="usuario@gmail.com"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Papel (Role)</label>
              <div className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-500">
                Operador (Padrão)
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="bg-blue-600 text-white px-8 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <i className="fas fa-circle-notch fa-spin"></i>
                  Salvando...
                </>
              ) : (
                'Salvar Usuário'
              )}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-blue-100 dark:border-slate-700 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Usuário</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">E-mail</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Papel</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Data Cadastro</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {users.map((u) => (
              <tr key={u.email} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 font-bold text-xs">
                      {u.displayName.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{u.displayName}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{u.email}</td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    u.role === UserRole.ADMIN 
                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' 
                      : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  }`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                  {new Date(u.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-right">
                  {u.email !== "gibasuporte@gmail.com" && (
                    <button 
                      onClick={() => handleDelete(u.email)}
                      className="text-rose-500 hover:text-rose-700 p-2 transition-colors"
                      title="Remover Usuário"
                    >
                      <i className="fas fa-trash-alt"></i>
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic">
                  Nenhum usuário cadastrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserManagement;
