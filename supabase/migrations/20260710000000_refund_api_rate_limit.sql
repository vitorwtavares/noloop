-- Returns one consumed unit to an active rate-limit window. Used to refund
-- quota when the rate-limited action fails after the limiter already counted it.
create or replace function public.refund_api_rate_limit(p_key text)
returns void as $$
begin
  if p_key is null or length(trim(p_key)) = 0 then
    raise exception 'rate limit key is required';
  end if;

  update public.api_rate_limits
  set count = count - 1,
      updated_at = now()
  where key = p_key
    and count > 0
    and reset_at > now();
end;
$$ language plpgsql
security definer
set search_path = public;

revoke all on function public.refund_api_rate_limit(text)
from
  public,
  anon,
  authenticated;

grant execute on function public.refund_api_rate_limit(text) to service_role;
