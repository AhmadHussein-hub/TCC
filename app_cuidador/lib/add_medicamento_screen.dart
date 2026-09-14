import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class AddMedicamentoScreen extends StatefulWidget {
  const AddMedicamentoScreen({super.key});

  @override
  State<AddMedicamentoScreen> createState() => _AddMedicamentoScreenState();
}

class _AddMedicamentoScreenState extends State<AddMedicamentoScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nomeController = TextEditingController();
  final _dosagemController = TextEditingController();
  final _frequenciaController = TextEditingController();
  final _atrasoController = TextEditingController();
  
  TimeOfDay? _horaInicio;
  bool _isLoading = false;

  // Função para abrir o relógio nativo e escolher a hora
  Future<void> _selecionarHora() async {
    final TimeOfDay? selecionada = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.now(),
      builder: (context, child) {
        return MediaQuery(
          data: MediaQuery.of(context).copyWith(alwaysUse24HourFormat: true),
          child: child!,
        );
      },
    );
    if (selecionada != null) {
      setState(() {
        _horaInicio = selecionada;
      });
    }
  }

  Future<void> _salvarMedicamento() async {
    if (!_formKey.currentState!.validate()) return;
    
    // Validação extra para garantir que a hora foi escolhida
    if (_horaInicio == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Por favor, selecione o horário da primeira dose.'), backgroundColor: Colors.red),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      // Formata a hora para o padrão que o banco aceita (HH:MM:00)
      final horaFormatada = '${_horaInicio!.hour.toString().padLeft(2, '0')}:${_horaInicio!.minute.toString().padLeft(2, '0')}:00';

      // TODO: Substituir por busca do id_paciente real vinculado ao cuidador logado
      // final userId = Supabase.instance.client.auth.currentUser?.id;
      // final pacienteData = await Supabase.instance.client.from('paciente').select('id_paciente').eq('id_cuidador', userId).single();
      // final idPaciente = pacienteData['id_paciente'];
      const int idPaciente = 1;

      await Supabase.instance.client.from('medicamento').insert({
        'id_paciente': idPaciente,
        'nome_farmaco': _nomeController.text.trim(),
        'dosagem': _dosagemController.text.trim(),
        'frequencia_horas': int.parse(_frequenciaController.text.trim()),
        'limite_atraso_minutos': int.parse(_atrasoController.text.trim()),
        'hora_inicio': horaFormatada, // Salvando o novo campo
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Medicamento cadastrado com horário inicial!'), backgroundColor: Colors.green),
        );
        Navigator.pop(context, true); 
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erro ao salvar: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Novo Medicamento'),
        backgroundColor: Colors.teal,
        foregroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              TextFormField(
                controller: _nomeController,
                decoration: const InputDecoration(labelText: 'Nome do Fármaco', border: OutlineInputBorder()),
                validator: (val) => val == null || val.isEmpty ? 'Campo obrigatório' : null,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _dosagemController,
                decoration: const InputDecoration(labelText: 'Dosagem (ex: 500mg)', border: OutlineInputBorder()),
                validator: (val) => val == null || val.isEmpty ? 'Campo obrigatório' : null,
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _frequenciaController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Frequência (horas)', border: OutlineInputBorder()),
                      validator: (val) => val == null || val.isEmpty ? 'Obrigatório' : null,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: TextFormField(
                      controller: _atrasoController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Tolerância (min)', border: OutlineInputBorder()),
                      validator: (val) => val == null || val.isEmpty ? 'Obrigatório' : null,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              
              // Botão para selecionar a hora
              OutlinedButton.icon(
                onPressed: _selecionarHora,
                icon: const Icon(Icons.access_time, color: Colors.teal),
                label: Text(
                  _horaInicio == null 
                      ? 'Definir horário da 1ª dose' 
                      : '1ª dose às ${_horaInicio!.hour.toString().padLeft(2, '0')}:${_horaInicio!.minute.toString().padLeft(2, '0')}',
                  style: const TextStyle(fontSize: 16, color: Colors.teal),
                ),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  side: const BorderSide(color: Colors.teal),
                ),
              ),
              
              const SizedBox(height: 32),
              ElevatedButton(
                onPressed: _isLoading ? null : _salvarMedicamento,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  backgroundColor: Colors.teal,
                  foregroundColor: Colors.white,
                ),
                child: _isLoading 
                    ? const CircularProgressIndicator(color: Colors.white)
                    : const Text('Salvar Medicamento', style: TextStyle(fontSize: 16)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}