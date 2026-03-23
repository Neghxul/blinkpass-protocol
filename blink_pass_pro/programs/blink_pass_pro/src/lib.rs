use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("Hu3NBNotayRTYcYzyEy3Gv5M2JGCKjA8EwgRzrV1UnWM"); 

#[program]
pub mod blink_pass_pro {
    use super::*;

    pub fn inicializar_evento(
        ctx: Context<InicializarEvento>, 
        id_evento: String, 
        precio_boleto_lamports: u64, 
        capacidad_maxima: u64
    ) -> Result<()> {
        let evento = &mut ctx.accounts.evento;
        
        evento.organizador = ctx.accounts.organizador.key();
        evento.id_evento = id_evento;
        evento.precio_boleto = precio_boleto_lamports;
        evento.capacidad_maxima = capacidad_maxima;
        evento.boletos_vendidos = 0;
        evento.tesoreria_bump = ctx.bumps.tesoreria;
        evento.activo = true;

        msg!("Evento creado. Precio: {} lamports", precio_boleto_lamports);
        Ok(())
    }

    pub fn comprar_boleto(ctx: Context<ComprarBoleto>, id_boleto: String) -> Result<()> {
        let evento = &mut ctx.accounts.evento;
        
        require!(evento.activo, ErroresProtocolo::EventoCerrado);
        require!(evento.boletos_vendidos < evento.capacidad_maxima, ErroresProtocolo::SoldOut);

        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.comprador.to_account_info(),
                to: ctx.accounts.tesoreria.to_account_info(),
            },
        );
        system_program::transfer(cpi_context, evento.precio_boleto)?;

        let boleto = &mut ctx.accounts.boleto;
        boleto.dueno = ctx.accounts.comprador.key();
        boleto.evento_vinculado = evento.key();
        boleto.id_boleto = id_boleto;
        boleto.estado = EstadoBoleto::Valido;

        evento.boletos_vendidos = evento.boletos_vendidos.checked_add(1).unwrap();

        msg!("Boleto comprado. Fondos asegurados en Escrow.");
        Ok(())
    }

    pub fn escanear_acceso(ctx: Context<EscanearAcceso>, _id_boleto: String) -> Result<()> {
        let boleto = &mut ctx.accounts.boleto;

        require!(boleto.estado == EstadoBoleto::Valido, ErroresProtocolo::BoletoInvalido);
        boleto.estado = EstadoBoleto::Escaneado;
        
        msg!("✅ Acceso Autorizado. Boleto quemado para prevenir clones.");
        Ok(())
    }

    pub fn transferir_boleto(ctx: Context<TransferirBoleto>, _id_boleto: String) -> Result<()> {
        let boleto = &mut ctx.accounts.boleto;
        let evento = &ctx.accounts.evento;

        // Regla 1: Solo se pueden revender/transferir boletos que no han sido usados
        require!(boleto.estado == EstadoBoleto::Valido, ErroresProtocolo::TransferenciaProhibida);
        
        // Regla 2: Solo el dueño actual puede transferirlo
        require!(boleto.dueno == ctx.accounts.dueno_actual.key(), ErroresProtocolo::NoEsElDueno);

        // Calculamos el 10% del precio original como "Fee de Regalía"
        let regalia_fee = evento.precio_boleto.checked_div(10).unwrap();

        // CPI: El dueño actual paga el 10% a la bóveda del organizador por el derecho a transferir
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.dueno_actual.to_account_info(),
                to: ctx.accounts.tesoreria.to_account_info(),
            },
        );
        system_program::transfer(cpi_context, regalia_fee)?;

        // Cambiamos el dueño criptográfico al nuevo usuario
        boleto.dueno = ctx.accounts.nuevo_dueno.key();

        msg!("Boleto transferido. Regalía del 10% pagada al creador del evento.");
        Ok(())
    }

    pub fn retirar_fondos(ctx: Context<RetirarFondos>) -> Result<()> {
        let tesoreria = &ctx.accounts.tesoreria;
        let organizador = &ctx.accounts.organizador;
        let evento = &ctx.accounts.evento;

        require!(evento.organizador == organizador.key(), ErroresProtocolo::NoEsElOrganizador);

        let balance_tesoreria = tesoreria.lamports();
        require!(balance_tesoreria > 0, ErroresProtocolo::TesoreriaVacia);

        let evento_key = evento.key();
        let bump = evento.tesoreria_bump;
        
        let signer_seeds: &[&[&[u8]]] = &[&[
            b"tesoreria",
            evento_key.as_ref(),
            &[bump],
        ]];

        let cpi_context = CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: tesoreria.to_account_info(),
                to: organizador.to_account_info(),
            },
            signer_seeds,
        );

        system_program::transfer(cpi_context, balance_tesoreria)?;

        msg!("Retiro exitoso: {} lamports transferidos a la wallet del organizador.", balance_tesoreria);
        Ok(())
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum EstadoBoleto {
    Valido,
    Escaneado,
    Reembolsado,
}

#[error_code]
pub enum ErroresProtocolo {
    #[msg("El evento ya no acepta compras.")]
    EventoCerrado,
    #[msg("Capacidad máxima alcanzada. Sold Out.")]
    SoldOut,
    #[msg("ALERTA: Este boleto ya fue escaneado o ha sido reembolsado.")]
    BoletoInvalido,
    #[msg("No puedes revender un boleto que ya fue escaneado en la puerta.")]
    TransferenciaProhibida,
    #[msg("Alerta de Seguridad: No eres el dueño criptográfico de este boleto.")]
    NoEsElDueno,
    #[msg("Alerta de Seguridad: Solo el organizador original puede retirar los fondos.")]
    NoEsElOrganizador,
    #[msg("La tesorería está vacía. No hay fondos para retirar.")]
    TesoreriaVacia,
}

#[account]
#[derive(InitSpace)]
pub struct Evento {
    pub organizador: Pubkey,
    #[max_len(30)]
    pub id_evento: String,
    pub precio_boleto: u64,
    pub capacidad_maxima: u64,
    pub boletos_vendidos: u64,
    pub tesoreria_bump: u8,
    pub activo: bool,
}

#[account]
#[derive(InitSpace)]
pub struct Boleto {
    pub dueno: Pubkey,
    pub evento_vinculado: Pubkey,
    #[max_len(30)]
    pub id_boleto: String,
    pub estado: EstadoBoleto,
}

#[derive(Accounts)]
#[instruction(id_evento: String)]
pub struct InicializarEvento<'info> {
    #[account(mut)]
    pub organizador: Signer<'info>,
    #[account(init, payer = organizador, space = 8 + Evento::INIT_SPACE, seeds = [b"evento", organizador.key().as_ref(), id_evento.as_bytes()], bump)]
    pub evento: Account<'info, Evento>,
    #[account(mut, seeds = [b"tesoreria", evento.key().as_ref()], bump)]
    pub tesoreria: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(id_boleto: String)]
pub struct ComprarBoleto<'info> {
    #[account(mut)]
    pub comprador: Signer<'info>,
    #[account(mut)]
    pub evento: Account<'info, Evento>,
    #[account(mut, seeds = [b"tesoreria", evento.key().as_ref()], bump = evento.tesoreria_bump)]
    pub tesoreria: AccountInfo<'info>,
    #[account(init, payer = comprador, space = 8 + Boleto::INIT_SPACE, seeds = [b"boleto", evento.key().as_ref(), id_boleto.as_bytes()], bump)]
    pub boleto: Account<'info, Boleto>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(id_boleto: String)]
pub struct EscanearAcceso<'info> {
    #[account(mut)]
    pub validador: Signer<'info>, 
    #[account(mut, seeds = [b"boleto", boleto.evento_vinculado.as_ref(), id_boleto.as_bytes()], bump)]
    pub boleto: Account<'info, Boleto>,
}

#[derive(Accounts)]
#[instruction(id_boleto: String)]
pub struct TransferirBoleto<'info> {
    #[account(mut)]
    pub dueno_actual: Signer<'info>,
    pub nuevo_dueno: AccountInfo<'info>, 
    pub evento: Account<'info, Evento>,
    #[account(mut, seeds = [b"tesoreria", evento.key().as_ref()], bump = evento.tesoreria_bump)]
    pub tesoreria: AccountInfo<'info>,
    #[account(mut, seeds = [b"boleto", evento.key().as_ref(), id_boleto.as_bytes()], bump)]
    pub boleto: Account<'info, Boleto>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RetirarFondos<'info> {
    #[account(mut)]
    pub organizador: Signer<'info>,
    #[account(mut, has_one = organizador)] 
    pub evento: Account<'info, Evento>,
    #[account(mut, seeds = [b"tesoreria", evento.key().as_ref()], bump = evento.tesoreria_bump)]
    pub tesoreria: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}